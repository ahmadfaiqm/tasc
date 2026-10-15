// api/lib/zona.js — jam dinding (kalender + HH:MM) di zona user -> instan UTC.
// Semua perhitungan tenggat server HARUS lewat sini agar konsisten
// (sebelumnya tiap route punya salinan dengan perlakuan zona berbeda).
export const ZONA_DEFAULT = 'Asia/Jakarta';

// Offset menit vs UTC untuk zona yang dikenal (tanpa DST); tak dikenal -> +7.
export function offsetMenitZona(tz) {
  switch (String(tz ?? '')) {
    case 'Asia/Jakarta':
    case 'Asia/Pontianak':
      return 7 * 60;
    case 'Asia/Makassar':
      return 8 * 60;
    case 'Asia/Jayapura':
      return 9 * 60;
    case 'UTC':
    case 'Etc/UTC':
      return 0;
    default:
      return 7 * 60;
  }
}

// dueDate: Date | 'YYYY-MM-DD'; dueTime: Date (@db.Time) | 'HH:MM'.
// Kembalikan instan UTC dari jam dinding di zona tz, atau null.
export function gabungDueZona(dueDate, dueTime, tz) {
  if (!dueDate || !dueTime) return null;
  let y, mo, d;
  if (dueDate instanceof Date) {
    if (Number.isNaN(dueDate.getTime())) return null;
    y = dueDate.getUTCFullYear();
    mo = dueDate.getUTCMonth();
    d = dueDate.getUTCDate();
  } else {
    const m = String(dueDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    y = Number(m[1]);
    mo = Number(m[2]) - 1;
    d = Number(m[3]);
    if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  }
  let hh, mm;
  if (dueTime instanceof Date) {
    if (Number.isNaN(dueTime.getTime())) return null;
    hh = dueTime.getUTCHours();
    mm = dueTime.getUTCMinutes();
  } else {
    const m = String(dueTime).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    hh = Number(m[1]);
    mm = Number(m[2]);
    if (hh > 23 || mm > 59) return null;
  }
  const off = offsetMenitZona(tz ?? ZONA_DEFAULT);
  return new Date(Date.UTC(y, mo, d, hh, mm) - off * 60e3);
}
