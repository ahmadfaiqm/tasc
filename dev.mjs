// dev.mjs — jalankan API + klien sekaligus dengan satu perintah.
// Mencegah kasus "klien jalan tapi API belum" yang membuat simpan task gagal
// (klien menembak proxy /api -> koneksi ditolak).
import { spawn } from 'node:child_process';

const anak = [
  spawn('npm --prefix api run dev', { stdio: 'inherit', shell: true }),
  spawn('npm --prefix client run dev', { stdio: 'inherit', shell: true }),
];

let keluar = false;
function matikan(kode = 0) {
  if (keluar) return;
  keluar = true;
  for (const p of anak) {
    try { p.kill(); } catch { /* abaikan */ }
  }
  process.exit(kode);
}

for (const p of anak) {
  p.on('exit', (kode) => { if (!keluar) matikan(kode ?? 0); });
}
process.on('SIGINT', () => matikan(0));
process.on('SIGTERM', () => matikan(0));
