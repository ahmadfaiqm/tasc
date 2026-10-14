# Desain: Redesign Landing Page Taska — Minimalist Terang ala Misso + Kipas Games UI

- Tanggal: 2026-10-14
- Status: draft — menunggu persetujuan pemilik
- Referensi visual: `Web Design Inspiration Misso.jpg` (layout & kartu), `Games Website UI.jpg` (kipas kartu rekap)
- Mockup interaktif terakhir: `.superpowers/brainstorm/1647-1791968593/content/layout-v7.html` (v7, sudah diuji responsif Desktop/Tablet/HP)

## 1. Intent dan kenapa

Pemilik tidak cocok dengan UI saat ini: terasa gelap, susunannya membingungkan, dan kesannya "terlalu AI" sehingga tidak bersih dan tidak profesional. Maunya satu landing page terang yang langsung terbaca dalam sekali pandang: task terdekat di atas, asisten memberi masukan otomatis tanpa ditanya, dan rekap bulanan yang hidup di bawah. Sukses = halaman putih terang yang lega, terasa seperti produk profesional, dan pemilik tidak minta revisi susunan lagi (revisi kecil masih wajar).

## 2. Goals

1. Satu halaman landing tanpa tab Ringkasan/Tugas/Rekap — semua tampil berurutan dari atas ke bawah.
2. Urutan baku: (a) task terbaru/terdekat bersebelahan dengan asisten, (b) kolom tulis tugas baru di bawahnya, (c) rekap bulanan paling bawah.
3. Asisten tampil proaktif: kartu masukan otomatis (mana dikerjakan dulu, peringatan jadwal padat) + saran cepat + kolom tulis.
4. Rekap bulanan berupa kipas kartu warna-warni ala Games UI: kartu tengah penuh di depan, kartu samping miring di belakang, tiap kartu ada badge bintang persentase selesai; ketuk kartu untuk menggesernya ke tengah dengan animasi slide halus; ketuk kartu aktif untuk masuk ke daftar detail bulan itu (dikelompokkan per hari).
5. Selalu terang apa pun pengaturan perangkat (mode gelap dimatikan untuk halaman ini).
6. Responsif: desktop 3 kolom, tablet task full-width di atas + 2 panel di bawah, HP satu kolom menumpuk + kipas versi ringkas.
7. Tidak ada mode tamu: semua pengguna wajib login via email atau OAuth (Google) sebelum bisa membuka halaman.

## 3. Non-goals

- Tidak mengubah API, database, logika parsing AI, urgency/priority, reminder, atau auth.
- Tidak menambah dependency baru (tanpa Tailwind, tanpa framer-motion, tanpa shadcn).
- Tidak me-redesign halaman Auth (halaman masuk/daftar tetap seperti sekarang).
- Tidak ada push notification atau fitur baru di luar tampilan.
- Tidak ada akses tanpa login: seluruh alur tamu/localStorage-only dihapus (`pilihTamu`, session `taskman:tamu`, cache lokal sebagai sumber utama). Auth tetap memakai Supabase (email + Google OAuth).

## 4. Anti-goals (dinyatakan gagal walau jalan)

- Masih ada permukaan gelap/hitam dominan, gradasi mencolok, efek 3D perspektif, atau warna neon (lime) sebagai aksen utama.
- Kartu-kartu seragam memenuhi lebar card sehingga terlihat membosankan.
- Rekap bulanan statis: tidak bisa digeser/diketuk.
- Tombol utama hitam pekat (pemilik eksplisit tidak suka).

## 5. Constraints

- Stack tetap: React 18 + CSS murni di `client/src/styles.css`; tidak ada library CSS/animasi baru.
- Semua data berasal dari prop/state yang sudah ada (`daftar`, `bento`, saran urutan, grouping per bulan di `History.jsx`) — hanya tampilan yang berubah.
- Animasi kipas: transform + transition CSS (~0,45 dtk); hormati `prefers-reduced-motion` (matikan animasi).
- Aksesibilitas yang sudah ada dipertahankan: `aria-label` tombol ikon, `role="log"` chat, fokus keyboard terlihat, semantic HTML.
- Semua teks UI tetap Bahasa Indonesia.

## 6. Bagian yang sudah diputuskan (jangan diubah tanpa izin pemilik)

### 6.1 Kerangka halaman (atas → bawah)

1. **Topbar terang**: logo Taska, nav (Hari ini, Tugas, Rekap, Asisten — anchor ke bagian halaman), chip akun, tombol Keluar (putih outline, bukan pil hitam).
2. **Baris sapaan**: avatar + "Halo, {nama}!" di kiri, judul "Task Hari Ini" di tengah, info tim/jumlah di kanan.
3. **Tiga panel sejajar (desktop)**:
   - Kiri: pemilih konteks ("Proyek Pribadi"), angka produktivitas besar (%), kartu aktivitas kuning (selesai / mendesak / aktif).
   - Tengah (paling lebar): kartu-kartu task terdekat. Task pertama menonjol (latar lembut + aksen kiri), sisanya baris ringkas dengan sekat; badge kecil (Terjadwal hijau lembut, Prioritas tinggi merah lembut, Task kuning lembut); tiap kartu menampilkan kolom Waktu, Urgensi/Tenggat, dan aksi ("Tandai selesai", "Tanya AI").
   - Kanan (paling ramping): kartu "Masukan cepat" berisi daftar masukan otomatis (tiap baris bisa diketuk) + kartu "Bilang ke Taska!" berisi kolom tulis + saran cepat.
4. **Kartu tulis tugas baru** di bawah panel: kolom teks + tombol utama + hint Ctrl+Enter.
5. **Rekap bulanan**: judul kecil + kipas 5 kartu (2 bulan lalu, bulan lalu, bulan ini, bulan depan, 2 bulan ke depan — hanya bulan yang relevan; bulan kosong tetap tampil redup). Panah ‹ › di samping + nama bulan aktif. Di bawah kipas: daftar detail bulan aktif dikelompokkan per hari (logika grouping `History.jsx` dipakai ulang, hanya di-restlyle).
6. **Dekor bukit hijau lembut** di paling bawah (seperti referensi Misso), murni dekoratif dan disembunyikan dari screen reader.

### 6.2 Kipas rekap (perilaku baku)

- Kartu tengah: skala 1, opacity 1, z-index teratas; kartu samping: mengecil dan turun bertahap, rotasi ±9° per langkah, redup; lebih dari 2 langkah disembunyikan.
- Interaksi: ketuk kartu samping → jadi aktif dengan animasi; panah ‹ › menggeser; keyboard ← → saat kipas fokus; ketuk kartu aktif → buka daftar detail bulan itu.
- Tiap kartu bulan punya warna pastel cerah berbeda (kuning, pink, biru langit, hijau mint, lavender) dengan teks gelap, angka total besar, dan badge bintang "★ {persen}%".
- Di HP: kartu lebih kecil dan jarak kipas lebih rapat; geser sentuh didukung (tetap ada panah sebagai fallback).

### 6.3 Sistem visual

- Latar halaman: biru sangat muda (`#dfeef7`-ish) dengan kartu putih radius besar (14–18px) dan bayangan lembut; kartu aksen kuning untuk aktivitas.
- Tombol utama terang (bukan hitam) — panggilan builder: putih outline.
- Tipografi dan font stack yang sudah ada dipertahankan (panggilan builder agar scope tidak melebar).
- Mode gelap `prefers-color-scheme: dark` dinonaktifkan untuk halaman ini (selalu terang).

## 7. Yang diserahkan ke builder (panggilan builder, tidak perlu ke pemilik)

- Nilai spacing, radius, dan bayangan yang pas.
- Set ikon per task dan avatar (boleh emoji/inisial seperti mockup).
- Gaya tombol utama: putih outline (boleh diusulkan varian selama tetap terang).
- Exact breakpoint: ±1024px dan ±700px.
- Detail daftar per-hari (sekat, jumlah "X tugas · Y selesai").
- Toast, preview kandidat AI, dan TaskList lama: di-restlyle mengikuti sistem di atas atau dipakai ulang dengan bungkus kartu baru — pilih yang paling sedikit berisiko.

## 8. File yang diperkirakan tersentuh

- `client/src/App.jsx` — susunan satu halaman (hapus tab Ringkasan/Tugas/Rekap) + hapus seluruh alur tamu (wajib `pengguna`, tanpa fallback localStorage sebagai sumber utama).
- `client/src/components/AuthPage.jsx` — pastikan login email dan tombol Google OAuth berfungsi (tanpa "Lanjut tanpa akun"); hapus baris kartu contoh (`CONTOH`/`kartu-contoh`) dan tombol "Mulai" (`cta-lime`) di navigasi.
- `client/src/components/Dashboard.jsx` — topbar + sapaan baru (atau digabung ke App bila lebih sederhana).
- `client/src/components/TaskList.jsx`, `TaskItem.jsx` — kartu task berkolom.
- `client/src/components/AssistantBox.jsx`, `SaranUrutan.jsx` — panel masukan + tulis.
- `client/src/components/History.jsx` — kipas + daftar per hari.
- `client/src/components/Ringkasan.jsx` — panel produktivitas kiri (atau dilebur).
- `client/src/styles.css` — tema selalu-terang, gaya kartu, kipas, responsif.
- Test yang ada (`*.test.js(x)`, e2e) wajib tetap hijau; tambah test interaksi kipas bila murah.

## 9. Kriteria selesai

1. Urutan halaman persis §6.1 di desktop, tablet, dan HP.
2. Kipas bisa diklik/digeser dengan animasi; kartu aktif bisa dibuka ke detail harian.
3. Tidak ada lagi tab navigasi dashboard, pil hitam, aksen lime neon, atau mode gelap di halaman ini.
4. Seluruh test client yang ada tetap lolos (diperbarui ke selector baru bila perlu, lihat §10.6).
5. Tanpa login tidak bisa membuka halaman utama (tidak ada tombol/akses tamu).

## 10. Hasil builder-check — keputusan (tidak perlu ke pemilik)

1. **Masukan cepat** = `SaranUrutan` yang di-restlyle (data lokal turunan, tanpa API baru). Ketuk baris → mengisi kolom chat asisten + scroll ke sana (tidak auto-kirim, sesuai prinsip AI read-only P0).
2. **Preview kandidat AI** (`Preview.jsx`) tetap ada, tampil inline tepat di bawah kartu tulis (transien, tidak mengubah urutan baku). **Edit/hapus per task dipertahankan** sebagai tombol ikon di kartu task (alur lama tidak hilang).
3. **"Tanya AI" per task** = scroll ke asisten + prefill `"Tanya soal: {judul}"`, tanpa auto-submit.
4. **Kipas**: jendela 5 kartu (2 lalu, kini, 2 depan), panah menggeser jendela; daftar detail bulan **muncul setelah kartu aktif diketuk** (sesuai "dipencet baru masuk ke daftar"); bulan kosong tetap tampil redup.
5. **"Proyek Pribadi"** = label statis ("Semua task"), bukan filter — tidak ada konsep proyek di data, dan filter fungsional melanggar non-goals.
6. **Test boleh diperbarui** ke selector/role baru karena DOM lama (tab, `.kartu-folder`) memang dihapus oleh desain ini; test logika/bisnis tidak boleh dilonggarkan.
7. **Tamu vs login: tidak ada tamu.** Semua pengguna wajib login (email atau Google OAuth) — yang belum login hanya melihat halaman Auth. Alur `modeTamu`/`pilihTamu` di `App.jsx` dihapus.
8. **Selalu-terang** = wrapper class `.landing-terang` yang mengunci variabel ke nilai terang; variabel global dan gaya Auth tidak diubah.
9. Jika mockup v7 dan teks §6 bertentangan, **teks dokumen ini yang normatif**.
