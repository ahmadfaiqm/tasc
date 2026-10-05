# Task Manager AI (baru) — Design Spec

Tanggal: 2026-10-05 | Status: disetujui user (pendekatan A) | Klasifikasi: architectural

> Keputusan: desain baru total (riwayat TASKA di HEAD diabaikan isinya).
> Pendekatan A — hybrid gratis: aturan lokal selalu jalan + LLM free-tier via proxy sebagai peningkatan, fallback otomatis.

Kebutuhan v1 yang disepakati:
- Web app (desktop + HP), deploy gratis (Vercel).
- Fitur AI inti: (1) parse paragraf Bahasa Indonesia menjadi tugas + tenggat, (2) urgensi + saran urutan otomatis. Chat asisten eksplisit: non-tujuan v1.
- Auth + sync cloud: Supabase. Tamu tetap bisa coba via localStorage.
- AI harus gratis: tanpa OpenAI berbayar. LLM free-tier (mis. Gemini Flash / Groq) opsional via server; aturan lokal wajib jalan offline.

## §1 — Arsitektur

```
taskman/
  client/ (React + Vite → Vercel static)
    src/lib/parserAturan.js  # parse + urgensi, murni lokal, tanpa key, unit-testable
    src/lib/api.js           # panggil POST /api/ai/parse, timeout 8 dtk, gagal -> fallback lokal
    src/components/ TaskList, TaskItem, SaranUrutan, Toast
  api/ (Express → Vercel serverless via vercel.json rewrites)
    index.js
    routes/ai.js  # POST /api/ai/parse {paragraf, now, timezone} -> {tugas[]}
    lib/llmGratis.js  # provider generik OpenAI-compatible: AI_PROVIDER + AI_KEY + AI_MODEL, default Gemini Flash free
  supabase/schema.sql  # tasks(id, user_id, nama, tenggat timestamptz, urgensi, selesai, reminded, created_at, updated_at), RLS per-user
```

- Auth Supabase email+password. Tamu: localStorage. Setelah login: migrasi sekali localStorage -> Supabase, lalu Supabase jadi sumber utama, localStorage jadi cache/antrean offline.
- AI: server coba LLM free-tier dulu (dengan `now` + `timezone` agar "jam 9 yang lewat = besok" benar). Key kosong / gagal / timeout / offline -> client pakai aturan lokal + badge "mode lokal". Key tidak pernah terekspos ke browser.
- Timer client 1-detik: pengingat tugas ≤ 5 menit (`REMINDER_MIN = 5`) + hapus-otomatis tugas lewat waktu dengan Urung 8 dtk. Batasan jujur: instan hanya saat halaman terbuka; tanpa backend always-on.
- Konstanta: `REMINDER_MIN = 5`, `AI_TIMEOUT_MS = 8000`, `UNDO_MS = 8000`.

## §2 — UI / Komponen

- Satu halaman Ruang Kerja. Desktop > 820px: dua kolom (kiri: input, kanan: daftar; bawah penuh: saran). HP ≤ 820px: satu kolom bertumpuk.
- Kiri atas: textarea paragraf + tombol "Susun jadi tugas" + badge mode (AI/Lokal) + notice privasi + tombol "pakai mode lokal saja".
- Kanan atas: daftar tugas. TaskItem grid: checkbox | nama+waktu | label urgensi | edit | hapus. Selesai = coret + redup. ≤ 5 menit = waktu bold + teks "segera".
- Bawah: panel "Saran urutan" otomatis (bukan chat): sebut tugas-1 + alasan + tugas-2 + sisa, dihitung urgensi -> tenggat.
- Toast tengah-bawah ± 4,5 dtk, `role="status"`. Chat log tidak ada di v1.
- Aksesibilitas: label untuk semua input, `aria-label` tombol ikon, outline fokus 2px, Enter kirim/simpan, Esc batal edit, hormati `prefers-reduced-motion`.

## §3 — Alur data end-to-end

1. Buat: paragraf -> `POST /api/ai/parse {paragraf, now, timezone}` -> LLM gratis; gagal -> parser lokal. Parser lokal: pecah pada titik/koma/baris baru/"lalu"/"kemudian"; pola jam absolut ("jam 9", "pukul 14.30"), relatif ("30 menit lagi", "2 jam lagi"), hari ("hari ini/besok/lusa" berlaku ke bagian berikut); tanpa jam -> +30 menit berantai. Hasil tampil optimistis + saran urutan otomatis.
2. Urgensi: Mendesak jika tenggat ≤ 2 jam atau kata kunci (mendesak/segera/penting/deadline/klien/darurat); Sedang jika ≤ 24 jam; sisanya Santai. Saran urutan = urgensi -> tenggat.
3. Ingatkan: tick 1 dtk -> `0 < tenggat - now ≤ 5 mnt`, belum `reminded`, belum selesai -> toast (+ `Notification` bila diizinkan) + `reminded = true`. Ubah tenggat -> `reminded = false`.
4. Bersihkan: `now > tenggat` -> hapus + toast + tombol Urung 8 dtk (arsip-sementara).
5. Simpan: login -> Supabase; tamu -> localStorage. Gagal tulis Supabase -> antre lokal + banner "belum tersinkron", retry otomatis last-write-wins via `updated_at`.

## §4 — Error handling & edge case

- LLM gagal/timeout/key kosong/offline -> fallback lokal + badge "mode lokal", tanpa blokir.
- Supabase offline/gagal tulis -> antre di localStorage + banner, retry otomatis.
- Izin notifikasi ditolak/tak didukung -> toast tetap jalan, tombol jadi penjelasan.
- Tugas tanpa jam -> +30 menit berantai. Ambang 5 menit via `REMINDER_MIN`.
- Privasi: paragraf hanya dikirim ke LLM saat tombol ditekan; ada notice + opsi mode lokal saja; data tidak dipakai di luar fungsi aplikasi.

## §5 — Testing

- Vitest: parser (jam absolut/relatif, besok/lusa, jam-lewat -> besok, +30 mnt berantai), urgensi (2 jam/24 jam + kata kunci), saran urutan.
- Supertest: `/ai/parse` (mock LLM + jalur fallback tanpa key), RLS (user tak bisa baca milik orang lain).
- Playwright smoke: tulis -> tersusun -> saran muncul -> centang -> edit -> hapus -> toast muncul.
- Aksesibilitas: kontras utama lolos, keyboard penuh.

## Non-tujuan v1

Chat asisten, kolaborasi tim, sub-tugas/dependensi/Gantt, integrasi kalender eksternal, aplikasi native mobile, tema terang + dashboard/kanban/kalender, tugas berulang, push saat aplikasi tertutup (butuh backend always-on berbayar).

## Pertanyaan terbuka (diputuskan sementara)

1. Hapus vs arsip -> arsip-sementara + Urung 8 dtk.
2. Tugas tanpa jam -> +30 menit berantai.
3. Ambang 5 menit -> tetap, via `REMINDER_MIN`.
4. Model AI -> LLM free-tier generik via proxy (default Gemini Flash); key via env; tanpa key = mode lokal penuh.
5. Zona waktu -> zona waktu client dikirim ke server setiap request parse.
