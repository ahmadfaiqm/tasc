# TASKA — Design Document

Task manager berbasis AI. Pengguna menulis rencana dalam satu paragraf, lalu sistem menyusunnya menjadi tugas yang bisa dicentang, diedit, dan dibatalkan, dengan pengingat otomatis dan asisten AI yang menyarankan urutan pengerjaan.

## 1. Referensi dan arah visual

Referensi dasar: portofolio gelap "TURA" (`pinteres45.jpg`). Yang diambil:

- Latar charcoal dengan vignette lembut di tengah, bukan hitam pekat.
- Wordmark sangat besar, tebal, huruf kapital, dengan bayangan lembut.
- Layout satu layar penuh per bagian (hero, pratinjau, kerja), diberi nomor urut 01 sampai 03.
- Elemen tetap di tepi: logo bertumpuk di kiri atas, navigasi kecil di kanan atas, ikon sosial di kiri bawah, tulisan "Gulir" vertikal di kanan bawah.
- Antarmuka monokrom, tanpa warna aksen. Warna hanya dipakai pada batang statistik di kartu folder. Hierarki dibangun dari terang-gelap, ukuran, dan bobot huruf.
- Kartu dan tombol timbul lewat bayangan, bukan garis tebal.

## 2. Design tokens

### Warna

| Token | Nilai | Fungsi |
|---|---|---|
| `--bg` | `#16171b` | Latar halaman |
| `--bg2` | `#202228` | Pusat vignette, balon chat AI, tombol ikon |
| `--card` | `#1b1c21` | Panel, jendela, tombol |
| `--line` | `#33353c` | Garis pemisah, border tipis |
| `--mute` | `#8d8f96` | Teks sekunder, label, ikon nonaktif |
| `--ink` | `#ecebe8` | Teks utama, centang, aksen terang |

Latar bagian: `radial-gradient(ellipse 70% 60% at 50% 45%, --bg2 0%, --bg 70%)`.

### Warna data (khusus batang statistik kartu folder)

Hijau `#1f9d73`, abu `#b5b7bb`, magenta `#b24a9c`, kuning-hijau `#c3c926`, dengan tekstur titik halus. Juga dipakai untuk penanda status di daftar riwayat: hijau untuk Selesai dan magenta untuk Belum selesai.

### Tipografi

- Font: **Syne** (pengganti Cera CY; mengikuti tampilan specimen Syne dari Google Fonts). Fallback: Century Gothic, Avenir Next, sans-serif.
- Bobot: 400 teks isi dan balon chat, 600 judul, label, dan tombol. Bobot 800 tidak dipakai karena Syne ExtraBold sangat melebar. Syne tidak punya bobot 300.

| Peran | Ukuran | Gaya |
|---|---|---|
| Wordmark (h1) | `clamp(64px, 15vw, 210px)` | 600, line-height .9 |
| Judul bagian (h2) | `clamp(32px, 4.8vw, 58px)` | 600, letter-spacing .03em |
| Judul panel (h3) | 22px | 600, letter-spacing .08em |
| Isi | 14px | 400, line-height 1.6 |
| Label, nav, tombol | 11–12px | huruf kapital, letter-spacing .14–.2em |

### Bentuk dan bayangan

- Radius: 3px untuk tombol dan kolom kecil, 6px untuk panel dan jendela, 12px untuk balon chat.
- Bayangan panel: `0 24px 50px rgba(0,0,0,.55)` ditambah `inset 0 0 0 1px --line`.
- Bayangan tombol: `0 10px 24px rgba(0,0,0,.45)`. Saat hover naik 2px dan bayangan menguat.
- Bayangan teks wordmark: `0 18px 40px rgba(0,0,0,.55)`.

## 3. Struktur halaman

1. **Hero (01):** wordmark TASKA, satu kalimat tagline, tombol "Coba sekarang".
2. **Folder Bulanan (02):** carousel tiga kartu folder berbentuk tab dengan takik di kanan atas, mengikuti screenshot referensi kartu profil. Tengah: bulan ini (tajam). Kiri: bulan lalu (buram dan diredupkan). Kanan: bulan depan, masih kosong. Klik kartu samping atau tombol ‹ › untuk berpindah. Tiap kartu memuat ikon folder, nama bulan, label status (Arsip, Bulan ini, Kosong), tiga angka ringkas (total, selesai, terlewat atau mendesak), dan empat batang statistik bertekstur titik. Angka dihitung dari tugas pengguna. Di bawah carousel ada daftar riwayat bulan terpilih dengan status Selesai, Belum selesai, atau Terjadwal. Carousel mencakup semua bulan yang punya tugas, ditambah bulan lalu, bulan ini, dan bulan depan.
3. **Ruang Kerja (03):** aplikasi fungsional dalam tiga panel.
   - Kiri atas: tulis rencana, tombol "Susun jadi tugas", tombol notifikasi.
   - Kanan atas: daftar tugas.
   - Bawah, selebar penuh: chat asisten AI.

Navigasi tetap: logo bertumpuk (TAS / KA), tautan "Folder" dan "Coba".

## 4. Komponen

### Item tugas

Grid satu baris: kotak centang, nama kegiatan dengan tanggal dan jam lengkap (mis. "Besok, 7 Okt · 16:00"), label urgensi, tombol ✎ (edit), tombol ✕ (batalkan).

- Selesai: teks dicoret dan diredupkan.
- Kurang dari 5 menit: waktu ditebalkan dan ditambah keterangan "kurang dari 5 menit".
- Mode edit: nama tugas, tenggat (tanggal dan jam), dan pilihan urgensi. Simpan dengan ✓ atau Enter, batal dengan ↩ atau Escape.

### Pengelompokan

Daftar tugas aktif dikelompokkan per bulan (judul huruf kapital, mis. OKTOBER 2026), lalu per hari (mis. "Hari ini · Selasa, 6 Oktober") dengan jumlah tugas di kanan. Di dalam hari, tugas diurutkan menurut jam. Riwayat rekap dikelompokkan per hari dengan jumlah tugas dan yang selesai.

### Label urgensi

| Tingkat | Tampilan |
|---|---|
| Mendesak | Latar terang (`--ink`), teks gelap, bold |
| Sedang | Teks terang, border `--mute` |
| Santai | Teks `--mute`, border `--line` |

Tingkat dibedakan oleh kontras dan bobot, tidak oleh warna.

### Chat asisten AI

- Balon pengguna di kanan: latar `--ink`, teks gelap.
- Balon AI di kiri: latar `--bg2`.
- Empat tombol saran cepat berbentuk pil di atas kolom input.
- Area pesan maksimal 300px, bisa digulir, otomatis turun ke pesan terbaru.

### Toast

Muncul di tengah bawah selama sekitar 4,5 detik untuk: tugas dibatalkan, tugas terhapus karena lewat waktu, dan pengingat 5 menit.

## 5. Perilaku dan aturan fitur

### Paragraf menjadi tugas

- Paragraf dipecah pada titik, titik koma, baris baru, koma, serta kata "lalu" dan "kemudian".
- Waktu dikenali dari "jam 9", "pukul 14.30", "13.30", "setengah 4", "jam 3 lewat 15", "jam 4 kurang 10", "30 menit lagi", "setengah jam lagi", dan angka dalam kata ("jam setengah empat", "jam sepuluh pagi", "lima belas menit lagi").
- Penanda waktu dalam sehari dipahami: pagi (jam 5 pagi = 05:00), siang (jam 1 siang = 13:00), sore (jam 4 sore = 16:00), malam (jam 8 malam = 20:00). "Besok sore" tanpa jam dibaca 16:00.
- Hari dikenali dari "hari ini", "nanti" (mis. "nanti sore"), "malam ini", "besok", "lusa", nama hari ("senin depan"), "akhir pekan", "minggu depan", "tanggal 20", dan "20 oktober".
- Nama tugas hanya berisi kegiatan: kata waktu dan kata pengantar seperti "mau", "ingin", "harus" dibuang ("besok jam 4 sore mau beli sepeda" menjadi "Beli sepeda", Besok, 7 Okt · 16:00).
- Tugas di hari yang sama dengan jam yang masih akan datang masuk daftar aktif. Jam yang sudah lewat masuk rekap dengan catatan.
- AI membaca semua tulisan pengguna lebih dulu: bahasa baku atau gaul, singkatan (malem, bsk, ntar), salah ketik, bahasa Inggris, dan campuran. Bila AI mengambil asumsi (mis. jam tidak disebut), asumsinya ditampilkan di bawah tombol. Aturan sederhana hanya cadangan bila AI tidak tersedia; aturan ini mengenali gaul umum dan bahasa Inggris dasar, tetapi tidak sepintar AI.
- Hari dikenali dari "hari ini", "besok", "lusa", dan berlaku ke bagian berikutnya sampai ada penanda hari lain.
- Jam yang sudah lewat tanpa penanda hari dianggap besok.
- Tanpa keterangan waktu, tenggat diset 30 menit setelah tugas sebelumnya.
- Setelah tugas tersusun, AI langsung memberi saran urutan pengerjaan di chat.

### Urgensi otomatis

- **Mendesak:** tenggat dalam 2 jam, atau teks memuat "urgent", "segera", "penting", "deadline", "klien", "darurat".
- **Sedang:** tenggat dalam 24 jam.
- **Santai:** selebihnya.
- Pengguna dapat mengubah tingkat secara manual saat mengedit.

### Penghapusan otomatis

Setiap detik sistem memeriksa tugas. Tugas yang tenggatnya sudah lewat keluar dari daftar aktif, baik sudah dicentang maupun belum, disertai toast. Tugas itu tidak dihapus: tetap tersimpan dan muncul di folder bulannya pada rekap.

### Notifikasi

- Tombol "Aktifkan notifikasi" meminta izin ke perangkat.
- Saat tenggat tinggal 5 menit atau kurang dan tugas belum selesai, muncul notifikasi perangkat dan toast di layar. Tiap tugas hanya diingatkan sekali. Mengubah tenggat mengatur ulang pengingatnya.

### Asisten AI

- Urutan saran: urgensi tertinggi lebih dulu, lalu tenggat terdekat.
- Jawaban menyebut tugas pertama beserta alasannya, tugas kedua, dan jumlah sisanya.
- Topik yang dipahami: prioritas atau mana yang dikerjakan dulu, jadwal mepet (jarak kurang dari 45 menit) dan hari padat (4 tugas atau lebih), tugas mendesak, serta ringkasan jadwal.
- Pertanyaan di luar topik dijawab dengan daftar hal yang bisa dibantu.

### Penyimpanan

Pengguna masuk lewat akun Claude. Tugas tiap pengguna disimpan di database platform pada ruang pribadinya dan dimuat ulang saat halaman dibuka. Bila halaman dibuka tanpa akun, tugas disimpan di browser (localStorage). Baris kecil di atas panel kerja menunjukkan mode yang aktif.

### Teks jadi tugas (AI)

Tombol "Susun jadi tugas" meminta AI mengubah paragraf menjadi daftar tugas (teks, tenggat, urgensi). Jika AI tidak tersedia atau ditolak, sistem memakai aturan sederhana. Chat juga meneruskan pertanyaan di luar topik bawaan ke AI.

## 6. Gerak

- Wordmark masuk dengan naik 24px, memudar-jelas (blur 8px ke 0), 1,1 detik.
- Hover tombol: naik 2px, bayangan menguat.
- Toast: memudar dan naik 20px.
- Scroll halus antar bagian.
- Semua animasi dimatikan saat pengguna memilih `prefers-reduced-motion`.

## 7. Responsif

- **Di atas 820px:** tiga jendela berjajar, panel kerja dua kolom, ikon sosial dan "Gulir" tampil.
- **820px ke bawah:** jendela samping disembunyikan, panel kerja satu kolom, ikon sosial dan "Gulir" disembunyikan, margin navigasi dikecilkan.
- **560px ke bawah:** balon chat melebar sampai 94%, label urgensi pindah ke baris kedua item tugas.
- Area aman perangkat (notch dan bar sistem) ditangani dengan `env(safe-area-inset-*)`.

## 8. Aksesibilitas

- Semua tombol ikon punya `aria-label` dan `title`.
- Kotak centang dan kolom input punya label.
- Daftar chat memakai `role="log"` dan toast memakai `role="status"`, sehingga pembaca layar menyampaikan pesan baru.
- Fokus keyboard ditandai outline 2px.
- Enter mengirim chat dan menyimpan edit, Escape membatalkan edit.
- Teks utama `#ecebe8` di atas `#16171b` memberi kontras tinggi. Teks sekunder `#8d8f96` lebih rendah kontrasnya, jadi dipakai hanya untuk informasi pendukung.

## 9. Batasan saat ini dan rencana

| Hal | Kondisi sekarang | Rencana |
|---|---|---|
| Asisten AI | Aturan sederhana di browser | Hubungkan ke model AI lewat backend agar bisa menjawab bebas |
| Pemecahan paragraf | Aturan dan pola kata | Gunakan model AI untuk teks yang lebih bebas |
| Notifikasi | Hanya saat halaman terbuka | Backend dengan push notification agar tetap sampai saat aplikasi tertutup |
| Penyimpanan | Per browser | Akun dan database agar sinkron antar perangkat |
| Tampilan | Hanya tema gelap | Tema terang, halaman dashboard (papan tugas dan kalender) |