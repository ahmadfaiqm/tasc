# TASKA PRD Alignment — Design Spec

Tanggal: 2026-10-07 | Status: disetujui user (Pendekatan A) | Klasifikasi: architectural

> Sumber kebenaran: `PRD.md` (v0.3, 88 section) + `dbdiagram.dbml` (Postgres, 9 tabel).
> Keputusan: scope MVP P0 penuh, Prisma sebagai DAL di API + Supabase Postgres/Auth, reset total diizinkan.
> Implementasi lama (skema mini `nama/tenggat/selesai`) dinyatakan tidak kompatibel dan diganti.

## §1 — Arsitektur

```
taskman/
  prisma/schema.prisma       # source of truth ORM, mirror dbdiagram.dbml
  supabase/schema.sql        # DDL reset total + RLS + index (dieksekusi di dashboard)
  api/
    lib/prisma.js            # singleton PrismaClient (DATABASE_URL pooled + DIRECT_URL)
    lib/validasi.js          # skema Zod: parse, task CRUD, chat, settings
    lib/llmGratis.js         # prompt baru: structured output PRD §32, no-fake-time
    lib/normalisasi.js       # samakan LLM -> kontrak PRD (due_date/time/precision/assumptions)
    lib/prioritas.js         # urgency + priority suggestion deterministik (backend memastikan)
    routes/tasks.js          # CRUD + complete/cancel (lifecycle PRD §20-22)
    routes/ai.js             # POST /parse (mutation candidate) + POST /chat read-only
    routes/history.js        # GET /history[/:y/:m] agregasi month->day->status
    routes/notifications.js  # settings + subscribe
  client/
    src/lib/parserAturan.js  # rewrite: no-fake-time, time_precision, assumption
    src/lib/api.js           # panggil API dengan Bearer JWT Supabase, timeout 8 dtk
    src/components/Preview.jsx (baru), History.jsx, AssistantBox.jsx (read-only)
    src/App.jsx              # Quick Capture -> preview -> confirm/edit/cancel
```

- Auth: Supabase email+password tetap. Client `supabase-js` hanya untuk Auth; semua data lewat API dengan `Authorization: Bearer <jwt>`, API verifikasi via `SUPABASE_JWT_SECRET` / user id dari token. Tidak ada query tasks langsung dari browser (PRD §60).
- DB: `users.id` = `auth.users(id)`. RLS per-user di semua tabel user-scoped. API juga filter `user_id` app-level (defense in depth).
- Prisma: `datasource db { provider="postgresql", url=env("DATABASE_URL"), directUrl=env("DIRECT_URL") }`. Model 1:1 dengan dbdiagram: `users, tasks, task_reminders, ai_interactions, task_recommendations, ai_actions, ai_assumptions, notification_settings, notification_subscriptions` + 11 enum. `deleted_at` untuk soft-delete (§25), `completed_at/cancelled_at` untuk lifecycle.
- Konstanta: `REMINDER_MIN=5`, `AI_TIMEOUT_MS=8000`, `UNDO_MS=8000`, `CONFLICT_GAP_MIN=45`, `BUSY_DAY_N=4`.

## §2 — Koreksi parser (no-fake-time, PRD §10-12)

Pelanggaran lama: tanpa jam -> +30 menit berantai (mengarang waktu). Perbaikan:
- Tanpa jam eksplisit -> `due_time=null, time_precision=UNSPECIFIED`. UI: "Jam belum ditentukan". Tidak ada reminder berbasis menit untuk task ini (§38).
- `due_date` selalu terisi bila ada penanda hari (today/tomorrow/lusa/nama hari/weekend); bila tidak ada sama sekali -> `due_date=today` + `assumption` "tanggal tidak disebut, dianggap hari ini" dengan `time_precision=UNSPECIFIED`.
- Pola: `jam|pukul H[.M]`, `jam 4 sore/malam/siang/pagi` (pm mapping), `setengah 4 sore -> 15:30`, `N menit/jam lagi`, `hari ini|besok|lusa|senin..minggu|akhir pekan|nanti sore/malam` (period). Jam-lewat hari ini -> besok.
- `title` bersih (tanpa tanggal/jam), `source_text` utuh, `description` untuk sisa kualifikasi ("warna hitam jika ada"), `duration_minutes` hanya bila disebut user else null (AI-estimate ditandai `duration_source=AI`, tidak dianggap fakta).
- `assumption` + `assumption_reason` selalu dikembalikan dan ditampilkan di Preview; confidence `high->preview langsung, medium->tampilkan assumption, low->clarification` (§33). Fallback rule-based pola diketahui + banner "AI tidak tersedia, pembacaan dasar".

## §3 — Urgency vs Priority (PRD §17-19)

- Urgency (sistem, dari deadline): `<=2j URGENT, <=24j NORMAL, else LOW`.
- Priority (pentingnya): `HIGH/MEDIUM/LOW` dari (1) eksplisit user, (2) AI inference keyword (`deadline/klien/skripsi/penting/mendesak/darurat`), (3) default SYSTEM=MEDIUM. Simpan `priority_source USER/AI/SYSTEM`. UI tampilkan alasan ("Prioritas tinggi — kata 'kumpulkan'").
- Saran urutan: sort `priority -> urgency -> due_datetime -> duration`. Rekomendasi disimpan ke `task_recommendations` (order+reason) untuk audit.

## §4 — API contracts (P0)

- `POST /ai/parse {paragraf, now, timezone}` -> `{sumber:'ai'|'lokal', tasks:[{title,description,source_text,due_date,due_time,time_precision,duration_minutes,urgency,priority,priority_source,assumptions[]}], clarification?: string}`. Validasi Zod; invalid -> 400; LLM gagal -> 200 lokal kosong agar client fallback.
- Tasks: `GET /tasks?status=&date=` (hanya milik user), `POST /tasks` (buat dari preview yang dikonfirmasi), `GET /tasks/:id`, `PATCH /tasks/:id` (ubah -> `reminded` reset bila due berubah, revalidasi), `DELETE /tasks/:id` (soft delete `deleted_at`), `POST /tasks/:id/complete` (set COMPLETED+completed_at, idempoten), `POST /tasks/:id/cancel` (set CANCELLED, tetap di history). Completed tidak kembali PENDING tanpa explicit reopen (`POST /:id/reopen`). Semua atomic, user-scoped, audit ke `ai_actions` bila via assistant.
- `POST /ai/chat {pesan}` read-only P0: tools `get_tasks/get_schedule/get_overdue_tasks/get_daily_summary` saja; mutation ditolak dengan pesan "gunakan preview untuk mengubah". Input user = data, bukan instruksi (anti prompt-injection §37).
- `GET /history`, `GET /history/:year/:month` -> `{total, completed, overdue, cancelled, completion_rate, urgent, byDay:{...}}`. Overdue dihitung, bukan status permanen.
- `GET/PATCH /notifications/settings`, `POST /notifications/subscribe`. Reminder: hanya bila `due_time!=null`, `reminder_at=due-5mnt`, status PENDING->SENT sekali (idempoten), didukung timer client 1-dtk (halaman terbuka) + endpoint `POST /tasks/sweep` (dipanggil timer/polling).
- Error states: `AI_LOADING/SUCCESS/PARTIAL/FAILED/FALLBACK/CLARIFICATION_REQUIRED/VALIDATION_FAILED` (§79), bukan sekadar loading/error.

## §5 — Frontend (P0)

- IA: Auth -> Home (Quick Capture, Today, Upcoming, AI Recommendation, Assistant read-only) -> History (prev/current/next month) -> Settings (Profile, Notification, AI/Privacy, Account).
- Quick Capture: input -> submit (cegah double) -> loading AI -> Preview list (title/date/time/assumption/priority) -> Confirm/Edit/Cancel (§55). Tanpa preview tidak ada tulis DB dari AI.
- Daftar aktif: grid checkbox|nama+waktu|label urgency+priority|edit|hapus; selesai=coret; `<=5mnt`=bold "segera". Daily grouping, conflict warning (overlap/<45mnt/busy>=4). History bulanan. AssistantBox read-only. Toast `role=status` 4.5 dtk + Urung 8 dtk untuk hapus-otomatis (arsip-sementara).
- Tamu: localStorage format baru; login: migrasi sekali via `POST /tasks` batch -> API jadi sumber utama, localStorage cache/antrean, banner "belum tersinkron" + retry 30 dtk, last-write-wins via `updated_at`.
- Aksesibilitas: label semua input, aria-label ikon, fokus 2px, Enter kirim/simpan, Esc batal, `prefers-reduced-motion`, kontras lolos. Bahasa Indonesia.

## §6 — Testing & rilis

- Vitest: parser (jam Indonesia, setengah, sore/malam, besok/lusa, jam-lewat->besok, no-fake-time->null), urgency/priority, conflict, saran.
- Supertest: CRUD + isolasi silang user (403), lifecycle (completed immutable, cancel≠delete), `/ai/parse` mock LLM + fallback tanpa key, `POST /ai/chat` menolak mutation.
- Playwright: capture->preview->confirm->complete->history; guest->login migrasi; toast+urung.
- Eval PRD §70: dataset 6 sample + metrik Task Interpretation Accuracy (tanpa koreksi user), date/time/splitting/priority/urgency/false-assumption/clarification accuracy.
- Rilis: `npm run test:all` PASS; SQL reset dieksekusi di Supabase kosong; Auth redirect terdaftar; 6 env Vercel (`VITE_SUPABASE_URL/ANON, VITE_API_URL, AI_PROVIDER/KEY/MODEL, DATABASE_URL/DIRECT_URL`); `npx prisma generate` + `prisma db push` (reset) sukses.

## Non-tujuan P0 (tetap deferred)

Chat mutation, kolaborasi tim, Gantt/dependensi, kalender eksternal sync, recurring, dashboard lanjut, native mobile, push saat tertutup (butuh always-on), multi-agent.
