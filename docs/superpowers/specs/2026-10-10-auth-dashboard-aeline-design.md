# Auth + Dashboard Aeline — Design Spec

Tanggal: 2026-10-10. Acuan: `design.md` working-copy (referensi Aeline).
Menggantikan: `docs/superpowers/specs/2026-10-10-auth-tura-reskin-design.md` + plan TURA (dibuat terhadap desain lama yang sudah tidak berlaku; dibiarkan sebagai arsip).

Keputusan terkunci: login **email + Google via Supabase** (mengalahkan design §2.5/§11 soal "akun Claude"); scope **sekaligus satu spec**; profil di **DB**; pendekatan **A. Evolusi di tempat** (reuse komponen, tanpa router).

## 1. Halaman masuk & daftar (`AuthPage`)

- Hero biru satu layar penuh (gradasi `#2a75e6 → #4f9bf2 → #a6d2ff` + elips putih kabur, margin 10px, radius 28px). Logo kiri atas (centang lime + "Taska"). Judul "Susun harimu bersama AI" (Syne 500, clamp 36–76px, -.03em) + subjudul satu kalimat.
- Kartu putih tengah: tab segmented Masuk/Daftar (label + `role=tab`), penjelasan singkat, tombol lime selebar kartu, pesan status (`role="alert"`), tautan "Lanjut tanpa akun (mode lokal)".
- Tab Daftar: nama tampilan (2–40 karakter, terisi otomatis dari akun bila ada) + checkbox persetujuan "AI boleh membaca tulisanku" (wajib dicentang, tanpanya tombol nonaktif) + email + sandi. Enter di kolom nama mengirim pendaftaran.
- Tab Masuk: email + sandi + tombol Google. Email tak terdaftar → pesan + arahkan ke tab Daftar (jangan diam-diam mendaftarkan).
- Empat kartu contoh berperspektif di bawah kartu (`aria-hidden`, sembunyi ≤820px).
- Sesudah login → Dashboard. Keluar → kembali ke halaman ini. Tamu → Dashboard tab Tugas, mode lokal.

## 2. Dashboard

- Header sticky: logo, nav pil (Ringkasan, Tugas, Rekap — ganti tab via state, tanpa router; sembunyi ≤900px), nama pengguna (sembunyi ≤560px), tombol Keluar (pil hitam).
- **Ringkasan:** label mikro "• RINGKASAN" (DM Mono), sapaan "Halo, {nama}", baris status akun, 4 kartu bento: Tugas aktif lime (aktif & belum lewat), Mendesak hitam (aktif + URGENT), Selesai bulan ini abu (persen + "X dari Y"), Berikutnya biru (tugas aktif terdekat: jam + nama + hari). Dihitung di client dari data tasks yang sudah dimuat.
- **Tugas:** 2 kolom (1 kolom ≤900px). Kiri: kartu "Tulis rencanamu" (textarea + 3 contoh klik-isi + tombol pil hitam "Susun jadi tugas" + notifikasi + Ctrl+Enter; kosongkan teks bila tugas berhasil dibuat) + kartu "Tugas" (reuse TaskList/Preview). Kanan: kartu "Asisten AI" sticky (reuse AssistantBox + SaranUrutan).
- **Rekap:** carousel folder di panggung abu membulat + tombol ‹ › dengan nama bulan + riwayat bulan terpilih (reuse History). Label status folder: Arsip, Bulan ini, Terjadwal, Kosong. Batang: Selesai lime, Belum selesai biru, Mendesak ink, Tepat waktu abu.

## 3. Tema & komponen

- Tokens Tabel design §3 (`--bg/--sf/--card/--ink/--mute/--line` terang+gelap, `--lime #d4f55c`, `--blue #2c78e6`). `color-scheme: light dark` mengikuti perangkat; hero selalu biru; kartu hitam/Mendesak selalu hitam-lime.
- Tipografi: Syne (judul/isi) + DM Mono 400 10–11px kapital (label, tombol, tab, tag) via Google Fonts. Radius 16–28px, pil penuh tombol/tag, bayangan lembut + `0 0 0 1px --line`; kartu login `0 30px 70px rgba(8,40,110,.3)`.
- Item tugas: checkbox lime saat centang; label Mendesak hitam-lime, Sedang lime-gelap, Santai abu, Selesai lime, Belum selesai merah muda lembut, Terjadwal abu. Chat: balon user hitam kanan, AI abu kiri, saran + input pil. Toast: pil hitam tengah-bawah ±4,5 dtk. Fokus: outline biru 2px. Gerak: hover naik 1px, carousel 0,5 dtk, hormati `prefers-reduced-motion`. Safe-area via `env()`.

## 4. Profil backend

- `User` += `ai_consent BOOLEAN NOT NULL DEFAULT false` (pakai kolom `name` yang ada, VARCHAR 100). Validasi Zod: nama 2–40 char; consent harus true saat daftar.
- Endpoint `GET/PATCH /api/profile` (auth wajib; hanya baris milik sendiri; respons 403 lintas-user). Alur daftar: signUp Supabase → PATCH profile (nama + consent) → masuk Dashboard.
- Ubah `prisma/schema.prisma` DAN `supabase/schema.sql` (cermin), lalu `prisma db push` ke DB yang sudah di-reset. Tanpa env Supabase → hanya mode tamu (seperti sekarang).

## 5. Testing & verifikasi

- Vitest: AuthPage (tab switching, tolak nama <2/>40 char, consent wajib, Google memanggil `signInWithOAuth`); Ringkasan (bento dari fixture: aktif/mendesak/persen/berikutnya); `/api/profile` (403 lintas-user, tolak nama invalid).
- Playwright ditulis ulang: tanpa sesi → halaman masuk terlihat; daftar (nama+consent) → dashboard; tamu → tab Tugas; Keluar → kembali ke halaman masuk.
- `npm.cmd run test:all` hijau sebelum push. Dashboard Supabase: provider Google aktif + redirect `tasc-phi.vercel.app` + localhost. Cek live prod (incognito): auth page, daftar, bento, tema terang+gelap.

## 6. Non-goals

- Tanpa react-router (tab via state). Tanpa tema manual (mengikuti perangkat). Tanpa ubah logika parser/urgensi/API task/AI. Tanpa push notification.
