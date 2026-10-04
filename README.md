# TASKA — task manager berbasis AI

Monorepo: `client/` (React+Vite) + `api/` (Express→serverless) + `supabase/schema.sql`.
Deploy: Vercel (root, `vercel.json` sudah disiapkan).

## Jalan lokal

npm.cmd install --prefix client
npm.cmd install --prefix api
npm.cmd --prefix client run dev      # http://localhost:5173
# terminal lain (butuh OPENAI_API_KEY untuk mode AI; tanpa itu otomatis mode lokal):
$env:OPENAI_API_KEY="..."; npm.cmd --prefix api run dev   # http://localhost:3001

## Env

Salin `.env.example` → `.env` / `.env.local` di tiap paket:
- client: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL (kosong = same-origin /api)
- api: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET

## Wajib sekali via dashboard (checklist)

1. Supabase SQL Editor: jalankan `supabase/schema.sql`.
2. Supabase Auth → URL Configuration: daftarkan redirect URL (produksi + `http://localhost:5173`) untuk magic link.
3. Vercel: import repo, isi 6 env di atas, Deploy.

## Batasan versi ini (sesuai spec)

- Notifikasi & hapus-otomatis instan hanya saat halaman terbuka (timer client 1-detik).
  Cron `/api/cron/cleanup` hanya cadangan per-menit.
- Tanpa OPENAI_API_KEY, fitur AI otomatis mode lokal (aturan design.md §5).
- Sync Supabase: migrasi sekali saat login; sync real-time penuh menyusul.
- Push saat aplikasi tertutup butuh backend always-on (di luar scope gratis).
