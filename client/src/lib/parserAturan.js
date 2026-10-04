export const REMINDER_MIN = 5;
export const MS_JAM = 3600000;

const BERSIH = /^(lalu|kemudian|dan)\s+/i;

export function splitParagraf(teks) {
  return String(teks || '')
    .split(/[.;\n]+|,(?=\s)|\s+lalu\s+|\s+kemudian\s+/i)
    .map((s) => s.trim().replace(BERSIH, '').trim())
    .filter(Boolean);
}

function jamKeMs(jam, menit = 0, penanda = '') {
  let h = Number(jam);
  const p = String(penanda || '').toLowerCase();
  if (p.includes('malam')) h = h === 12 ? 0 : h + 12;
  else if ((p.includes('sore') || p.includes('petang')) && h < 12) h += 12;
  return (h % 24) * MS_JAM + Number(menit || 0) * 60000;
}

function awalHariLokal(ms) {
  // Wall-clock lokal (WIB tak punya DST; zona ber-DST bisa geser ±1 jam di hari transisi — diterima).
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function ekstrakWaktu(potongan, basisMs, hariAktif) {
  const s = String(potongan).toLowerCase();
  let hariBerikut = null;
  if (s.includes('lusa')) hariBerikut = 'lusa';
  else if (s.includes('besok')) hariBerikut = 'besok';
  else if (s.includes('hari ini')) hariBerikut = 'hari ini';
  const hari = hariBerikut || hariAktif;

  let m = s.match(/(?:jam|pukul)\s*(\d{1,2})(?:[.:](\d{1,2}))?\s*(pagi|siang|sore|petang|malam)?/);
  if (m) {
    const offsetHari = hari === 'besok' ? 1 : hari === 'lusa' ? 2 : 0;
    let t = awalHariLokal(basisMs) + offsetHari * 86400000 + jamKeMs(m[1], m[2], m[3]);
    if (!hari && t <= basisMs) t += 86400000; // jam lewat tanpa penanda hari = besok
    return { tenggatMs: t, hariBerikut };
  }
  m = s.match(/(\d+)\s*jam\s*lagi/);
  if (m) return { tenggatMs: basisMs + Number(m[1]) * MS_JAM, hariBerikut };
  m = s.match(/(\d+)\s*menit\s*lagi/);
  if (m) return { tenggatMs: basisMs + Number(m[1]) * 60000, hariBerikut };
  return { tenggatMs: null, hariBerikut };
}

export function susunTugas(paragraf, nowISO) {
  const basis = new Date(nowISO).getTime();
  const potongan = splitParagraf(paragraf);
  let hariAktif = null;
  let terakhir = basis;
  return potongan.map((nama) => {
    const { tenggatMs, hariBerikut } = ekstrakWaktu(nama, basis, hariAktif);
    if (hariBerikut) hariAktif = hariBerikut;
    const t = tenggatMs === null ? terakhir + 30 * 60000 : tenggatMs;
    terakhir = t;
    return { nama, tenggat: new Date(t).toISOString() };
  });
}
