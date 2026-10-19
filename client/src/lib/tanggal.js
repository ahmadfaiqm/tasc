// client/src/lib/tanggal.js
// Nama hari + tanggal dari 'YYYY-MM-DD' (kalender valid) untuk pratinjau tanggal.
export function hariTanggal(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? ''));
  if (!m) return '';
  const y = Number(m[1]);
  const bl = Number(m[2]);
  const hr = Number(m[3]);
  const d = new Date(y, bl - 1, hr);
  // Tolak tanggal rollover seperti 2026-02-30.
  if (d.getFullYear() !== y || d.getMonth() !== bl - 1 || d.getDate() !== hr) return '';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}
