# TASKA — Design Spec (disetujui)

Tanggal: 2026-10-04 | Status: disetujui user | Sumber: `prd.md` (PRD v0.1) + `design.md` (patokan UI)

> Keputusan brainstorming: Pendekatan A — monorepo all-in Vercel (gratis),
> frontend React+Vite, backend Express (serverless), Supabase Auth email+password + RLS,
> AI via OpenAI dengan fallback aturan lokal, tanpa Cloudinary.

## §1 — Arsitektur

```
taskman/
  client/ (React + Vite → Vercel static)
    src/pages: Hero (01), FiturAI (02), RuangKerja (03)
    src/components: TaskItem, TaskList, ChatAsisten, Toast, Countdown
    src/lib: parserAturan.js, api.js, supabase.js, notifikasi.js
  api/ (Express → serverless via vercel.json rewrites)
    index.js, routes/ai.js, routes/tasks.js, routes/push.js, lib/openai.js
  supabase/schema.sql (tabel + RLS)
```

- **Auth & data:** Supabase Auth email+password. Tabel `tasks
  (id, user_id, nama, tenggat timestamptz, urgensi, selesai, reminded, created_at,
  updated_at)` + `push_subscriptions (user_id, subscription jsonb)`.
  RLS: user hanya baca/tulis miliknya. Tamu (belum login) tetap bisa pakai via
  localStorage (F11); setelah login baca/tulis Supabase, localStorage jadi cache offline.
- **AI:** `POST /api/ai/parse {paragraf, now, timezone}` dan
  `POST /api/ai/chat {pesan, tasks}` proxy ke OpenAI di server (key tidak terekspos).
  Key kosong/gagal/offline → fallback otomatis ke aturan lokal design.md §5.
  Target respons AI < beberapa detik (PRD §7, perlu validasi); UI tampilkan status "mengetik…".
- **Timer & notifikasi:** satu `setInterval` 1 detik di client: hapus-otomatis tugas lewat
  waktu + toast, tandai tugas ≤ 5 menit, kirim `Notification` + toast sekali per tugas
  (flag `reminded`, reset saat tenggat diubah). Vercel Cron 1/menit hanya pembersih cadangan.
  Batasan jujur: notifikasi hanya saat halaman terbuka (PRD F14 penuh butuh backend
  always-on = berbayar, ditunda).
- **Konstanta:** `REMINDER_MIN = 5` (siap diatur, menjawab PRD #3).

## §2 — Komponen UI (patokan design.md, monokrom)

- **Token:** `--bg #16171b`, `--bg2 #202228`, `--card #1b1c21`, `--line #33353c`,
  `--mute #8d8f96`, `--ink #ecebe8`;
  latar `radial-gradient(ellipse 70% 60% at 50% 45%, var(--bg2) 0%, var(--bg) 70%)`.
  Font Outfit (300 isi / 400 balon / 600 label / 800 judul), fallback Century Gothic,
  Avenir Next, sans-serif. Wordmark `clamp(76px, 17vw, 230px)`, 800, lh .9,
  shadow `0 18px 40px rgba(0,0,0,.55)`. Radius 3px tombol, 6px panel, 12px balon chat.
  Shadow panel `0 24px 50px rgba(0,0,0,.55) + inset 0 0 0 1px var(--line)`.
- **Halaman:** Hero 01 (wordmark TASKA + 1 kalimat tagline + "Coba sekarang" scroll ke 03) →
  Fitur AI 02 (3 jendela berjajar, tengah tajam contoh chat, samping blur; judul +
  deskripsi + tombol) → Ruang Kerja 03 (kiri atas: textarea + "Susun jadi tugas" +
  "Aktifkan notifikasi"; kanan atas: daftar tugas; bawah penuh: chat AI + 4 pil saran cepat).
  Chrome tetap: logo TAS/KA kiri atas, nav "Fitur AI" + "Coba" kanan atas,
  sosmed kiri bawah, "Gulir" vertikal kanan bawah.
- **TaskItem** grid (checkbox | teks+waktu | label urgensi | ✎ | ✕):
  selesai = coret + redup; ≤ 5 menit = waktu bold + "kurang dari 5 menit";
  mode edit = nama + tanggal + jam + pilih urgensi, ✓/Enter simpan, ↩/Esc batal.
  Label: Mendesak = bg `--ink` teks gelap bold; Sedang = teks terang border `--mute`;
  Santai = teks `--mute` border `--line`.
- **Chat:** user kanan (`--ink`/teks gelap), AI kiri (`--bg2`); area ≤ 300px scroll +
  autoscroll; `role="log"`. **Toast** tengah-bawah ±4,5 dtk, `role="status"`.
- **Gerak:** wordmark naik 24px blur-in 1,1 dtk; hover tombol naik 2px + shadow menguat;
  toast fade + naik 20px; scroll halus; hormati `prefers-reduced-motion`.
- **Responsif:** > 820px dua kolom + chrome penuh; ≤ 820px satu kolom,
  jendela samping/ikon/"Gulir" hilang; ≤ 560px balon 94%, label ke baris 2;
  `env(safe-area-inset-*)` untuk notch.
- **Aksesibilitas:** `aria-label`+`title` tiap tombol ikon, label untuk checkbox/input,
  outline fokus 2px, Enter kirim/simpan, Esc batal edit. `#8d8f96` hanya info sekunder.

## §3 — Alur data end-to-end

1. **Buat:** paragraf → `POST /api/ai/parse {paragraf, now, timezone}` → OpenAI
   (dengan `now` + zona waktu agar "jam 9 yang lewat = besok" benar); gagal → fallback
   parser lokal (pecah pada titik/koma/baris baru/"lalu"/"kemudian"; pola "jam 9",
   "pukul 14.30", "30 menit lagi", "2 jam lagi"; hari ini/besok/lusa berlaku ke
   bagian berikut; tanpa jam → +30 menit berantai). Hasil tampil optimistis +
   saran urutan otomatis di chat (urgensi → tenggat; sebut tugas-1 + alasan +
   tugas-2 + sisa). Simpan: login → Supabase, tamu → localStorage.
2. **Kelola:** centang/edit/hapus → update optimistis + sinkron; ubah tenggat →
   `reminded = false`. Urgensi otomatis: Mendesak jika tenggat ≤ 2 jam atau kata kunci
   (urgent/segera/penting/deadline/klien/darurat); Sedang jika ≤ 24 jam; selebihnya Santai.
3. **Ingatkan:** tick 1 dtk → `0 < tenggat − now ≤ 5 mnt`, belum `reminded`, belum selesai
   → toast + `Notification` + `reminded = true`.
4. **Bersihkan:** `now > tenggat` → hapus + toast + tombol Urung 8 dtk (arsip-sementara,
   menjawab PRD #1). Cron server hanya cadangan.
5. **Chat:** `POST /api/ai/chat {pesan, tasks}` → OpenAI dengan konteks tugas aktif
   (topik: prioritas/mana dulu, mepet < 45 mnt, padat ≥ 4/hari, mendesak, ringkasan;
   jawab Bahasa Indonesia + alasan); di luar topik → balas daftar kemampuan.
   Fallback aturan lokal bila offline.

## §4 — Error handling & edge case

- OpenAI gagal/timeout (abort > 8 dtk) → fallback lokal + badge "mode offline", tanpa blokir.
- Izin notifikasi ditolak/tak didukung → tombol jadi penjelasan + toast; inti tetap jalan.
- Supabase offline/gagal tulis → antre di localStorage + banner "belum tersinkron",
  retry otomatis (last-write-wins per `updated_at`).
- Tugas tanpa jam → +30 menit berantai. Ambang 5 menit via `REMINDER_MIN`.
- **Privasi (PRD §7):** paragraf hanya dikirim ke OpenAI saat fitur AI dipakai;
  ada notice + tombol "pakai mode lokal saja"; data tidak dipakai di luar fungsi aplikasi.

## §5 — Testing

- **Vitest:** parser (jam absolut/relatif, besok/lusa, jam-lewat → besok, +30 mnt berantai),
  urgensi (2 jam/24 jam + kata kunci), mepet < 45 mnt & padat ≥ 4, urutan saran.
- **Supertest:** `/ai/*` (mock OpenAI + jalur fallback), RLS (user tak bisa baca milik orang lain).
- **Playwright smoke:** tulis → tersusun → centang → edit → hapus; chat 4 topik; toast muncul.
- Aksesibilitas: kontras utama lolos; `#8d8f96` hanya sekunder; keyboard penuh.

## Non-tujuan versi ini (PRD §3)

Kolaborasi tim, sub-tugas/dependensi/Gantt, integrasi kalender eksternal, aplikasi native
mobile, tema terang + dashboard/kanban/kalender (P2), tugas berulang (P2).

## Pertanyaan terbuka (PRD §13, diputuskan sementara)

1. Hapus vs arsip → **diputuskan sementara:** arsip-sementara + Urung 8 dtk.
2. Tugas tanpa jam → **diputuskan:** +30 menit berantai.
3. Ambang 5 menit → **diputuskan:** tetap, via konstanta `REMINDER_MIN`.
4. Model AI → **diputuskan:** OpenAI via proxy server; key via env.
5–6. Monetisasi & zona waktu → di luar scope versi ini (zona waktu client dikirim ke server).
