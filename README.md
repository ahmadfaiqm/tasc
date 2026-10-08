# TASKA — AI-Powered Task Manager & Personal Task Assistant

Task manager yang memahami Bahasa Indonesia sehari-hari: tulis paragraf rencana,
TASKA memecahnya menjadi task terstruktur, menentukan urgensi dan prioritas,
memberi saran urutan pengerjaan, mengingatkan menjelang tenggat, dan menyimpan
riwayat sebagai konteks asisten.

Sumber kebenaran produk: `PRD.md` (v0.3) + `dbdiagram.dbml`.
Desain dan rencana implementasi: `docs/superpowers/specs/` + `docs/superpowers/plans/`.

## Arsitektur

Monorepo: `client/` (React + Vite → Vercel static) + `api/` (Express → Vercel
serverless) + Supabase (Auth + Postgres).

```
taskman/
  client/src/
    App.jsx                 # Ruang Kerja: capture -> preview -> confirm
    lib/parserAturan.js     # parser lokal + urgency/priority (no-fake-time)
    lib/api.js              # panggil API dengan Bearer JWT, timeout 8 dtk
    components/Preview.jsx  # kandidat task + asumsi AI + Confirm/Edit/Cancel
    components/History.jsx  # ringkasan bulanan
    components/AssistantBox.jsx  # asisten read-only (tanpa mutasi)
  api/
    routes/tasks.js         # CRUD + complete/cancel/reopen + sweep
    routes/ai.js            # POST /parse + POST /chat (read-only)
    routes/history.js       # agregasi month -> day -> status
    routes/notifications.js # settings + subscribe
    lib/llmGratis.js        # LLM free-tier via proxy (OpenAI-compatible)
    lib/prioritas.js        # urgency + priority deterministik (backend memastikan)
  prisma/schema.prisma      # source of truth ORM (9 tabel + 11 enum, mirror dbdiagram)
  supabase/schema.sql       # DDL reset + RLS per-user (dieksekusi via dashboard)
```

Prinsip kunci (dari PRD): **tanpa jam eksplisit → `due_time = null`,
tampil "Jam belum ditentukan"** — sistem tidak mengarang waktu. Task tanpa jam
tidak punya reminder berbasis menit. Overdue dihitung (`PENDING` + lewat
tenggat), bukan status permanen. Cancel ≠ delete; history selalu disimpan.
AI hanya di server (key tidak ke browser); tanpa key → mode lokal penuh.

## Jalan lokal

```powershell
npm.cmd install --prefix client
npm.cmd install --prefix api
npm.cmd --prefix client run dev      # http://localhost:5173
# terminal lain:
npm.cmd --prefix api run dev         # http://localhost:3001
```

(Catatan Windows: `npm.ps1` diblokir ExecutionPolicy di mesin ini — pakai `npm.cmd`.)

## Env

Salin `*.env.example` → `.env` di tiap paket (jangan commit `.env`):

- client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
  (kosong = same-origin `/api`)
- api: `AI_PROVIDER`, `AI_KEY`, `AI_MODEL` (LLM free-tier OpenAI-compatible;
  kosong = mode lokal penuh), `DATABASE_URL`, `DIRECT_URL` (Supabase pooled +
  direct), `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (verifikasi JWT; tanpa ini
  auth hanya decode — untuk dev/test saja)

## Wajib sekali via dashboard (checklist rilis)

1. Supabase SQL Editor: jalankan `supabase/schema.sql` (reset total 9 tabel + RLS).
2. Supabase Auth → URL Configuration: daftarkan redirect (produksi + `http://localhost:5173`).
3. Vercel: import repo, isi 8 env di atas, Deploy.
4. `npx --prefix api prisma db push --schema=prisma/schema.prisma` (dari root;
   atau dari `api/`: `npx prisma db push --schema=../prisma/schema.prisma`)
   (hanya ke DB yang sudah di-reset; jangan ke DB berisi data penting).
5. Verifikasi: RLS menolak baca silang antar-user; 403 lintas-user;
   reminder terkirim sekali (idempoten).

## Tes

```powershell
npm.cmd run test:all
```

Vitest: parser no-fake-time, urgency/priority, kontrak API + 403/idempoten
(mock-Prisma), eval dataset PRD (`src/lib/evalPrd.test.js`). Playwright smoke:
capture → preview → confirm → history (`client/e2e/smoke.spec.js`).

## Batasan versi ini (jujur, sesuai PRD)

- Reminder + hapus-otomatis instan hanya saat halaman terbuka (timer client 1 detik).
  `POST /api/tasks/sweep` adalah endpoint pendukung, bukan cron always-on.
- Push saat aplikasi tertutup butuh backend always-on = P1 (tabel
  `notification_subscriptions` sudah disiapkan).
- Asisten P0 read-only; mutasi via chat, kalender eksternal, recurring,
  dashboard lanjut = rilis berikutnya.
