# Auth Gate + Reskin TURA — Design Spec

Tanggal: 2026-10-10. Status: disetujui per bagian oleh owner. Pendekatan: A (gate + reskin di tempat, tanpa router baru).

## 1. Latar & keputusan

- Permintaan: selaraskan UI/UX ke `design.md` baru (TURA gelap) + pastikan login memakai email.
- Keputusan login: **email + sandi + Google OAuth** via Supabase Auth (sesuai PRD P0/P1).
- Keputusan penempatan: **layar Auth khusus** sebagai gerbang kondisional sebelum Hero/Folder/Kerja.
- Keputusan scope: **full reskin TURA** (tokens, tipografi Syne, bayangan, gerak, responsif).
- Koreksi konflik: `design.md` bag. 5 menyebut "masuk lewat akun Claude" — diganti Supabase email+Google saat implementasi (satu baris + spec ini sebagai rujukan).

## 2. Arsitektur & komponen

- Baru: `client/src/components/AuthGate.jsx` — layar penuh: latar vignette charcoal, wordmark TASKA kecil, kartu `--card` berisi: field email, field sandi, tombol primer Masuk, tombol sekunder Daftar, divider "atau", tombol "Masuk dengan Google", link "lanjut sebagai tamu". Pesan error inline di kartu + loading state di tombol.
- Ubah: `client/src/App.jsx` — jika `pengguna == null && !modeTamu`, render `<AuthGate>` (Hero/Folder/Kerja disembunyikan). Pilihan tamu disimpan di `sessionStorage` (gate muncul lagi di kunjungan baru, tidak hilang saat re-render). Kartu akun inline di Ruang Kerja (`App.jsx:508-531`) disederhanakan menjadi status bar (email + Keluar); form pindah ke gate. State `modeTamu` baru; tamu tetap pakai localStorage seperti sekarang.
- OAuth: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`. Callback ditangkap `onAuthStateChange` yang sudah ada — tidak ada route callback baru.
- Langkah dashboard (di luar kode, wajib sebelum verifikasi prod): Supabase Auth → aktifkan provider Google; URL Configuration → daftarkan `https://tasc-phi.vercel.app` + `http://localhost:5173`.

## 3. Reskin TURA (visual, tanpa ubah perilaku)

- `client/src/styles.css`: terapkan tokens (`--bg #16171b`, `--bg2 #202228`, `--card #1b1c21`, `--line #33353c`, `--mute #8d8f96`, `--ink #ecebe8`), font Syne, radius 3/6/12px, bayangan panel/tombol/wordmark, wordmark `clamp(64px,15vw,210px)`, animasi masuk + `prefers-reduced-motion`, breakpoint 820px/560px, `env(safe-area-inset-*)`.
- Struktur DOM dipertahankan (nav tetap, 01 Hero, 02 Folder, 03 Kerja, toast 4,5 dtk). Perilaku parser/preview/chat/reminder tidak berubah.
- File disentuh: `styles.css` (besar), `App.jsx` (gate + status bar), baru `AuthGate.jsx`, `index.html` (hanya bila title/meta perlu), `design.md` (koreksi satu baris "akun Claude"). Logika `lib/`, `api/`, dan skema tidak disentuh.

## 4. Error handling

- Email kosong/invalid, sandi salah, OAuth dibatalkan/gagal → pesan inline di kartu AuthGate + toast sebagai penguat, bukan pengganti.
- Tombol Masuk/Daftar/Google nonaktif + spinner teks selama request berjalan (cegah double submit).
- Tanpa env Supabase (`supabase == null`) → gate hanya menawarkan mode tamu, sama seperti fallback sekarang.

## 5. Testing & verifikasi

- Vitest baru (`AuthGate.test.jsx`, mock supabase): render field email/sandi, tolak submit email kosong, tombol Google memanggil `signInWithOAuth` dengan provider google.
- Playwright smoke diperluas: tanpa sesi → gate tampil; pilih tamu → ruang kerja mode tamu; (login asli hanya manual di prod).
- `npm.cmd run test:all` hijau sebelum push. Pasca auto-deploy Vercel: cek `/` tampil gate, login email + Google di `tasc-phi.vercel.app` berhasil, redirect URI terdaftar.

## 6. Non-goals

- Tanpa react-router / rute `/login` terpisah (YAGNI untuk app satu halaman anchor).
- Tanpa tema terang, dashboard, atau perubahan alur task/AI.
