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

const KATA_MENDESAK = ['urgent', 'segera', 'penting', 'deadline', 'klien', 'darurat'];
const BOBOT = { mendesak: 0, sedang: 1, santai: 2 };

export function tentukanUrgensi(nama, tenggatMs, nowMs) {
  const s = String(nama || '').toLowerCase();
  if (tenggatMs - nowMs <= 2 * MS_JAM) return 'mendesak';
  if (KATA_MENDESAK.some((k) => s.includes(k))) return 'mendesak';
  if (tenggatMs - nowMs <= 24 * MS_JAM) return 'sedang';
  return 'santai';
}

export function urutkanSaran(tasks, nowMs) {
  void nowMs;
  return [...tasks]
    .filter((t) => !t.selesai)
    .sort(
      (a, b) => BOBOT[a.urgensi] - BOBOT[b.urgensi] || new Date(a.tenggat) - new Date(b.tenggat),
    );
}

function fmtJam(isoString) {
  const d = new Date(isoString);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}.${p(d.getMinutes())}`;
}

export function jawabLokal(pesan, tasks, nowMs) {
  const s = String(pesan || '').toLowerCase();
  const aktif = (tasks || []).filter((t) => !t.selesai);
  const isMepet = (a, b) => Math.abs(new Date(a.tenggat) - new Date(b.tenggat)) < 45 * 60000;

  if (/mepet|padat|bertabrakan|bentrok/.test(s)) {
    const pasangan = [];
    const perHari = {};
    for (const t of aktif) {
      const hari = new Date(t.tenggat).toDateString();
      (perHari[hari] = perHari[hari] || []).push(t);
    }
    for (let i = 0; i < aktif.length; i++)
      for (let j = i + 1; j < aktif.length; j++) if (isMepet(aktif[i], aktif[j])) pasangan.push([aktif[i], aktif[j]]);
    const hariPadat = Object.entries(perHari).filter(([, v]) => v.length >= 4);
    if (!pasangan.length && !hariPadat.length)
      return 'Jadwalmu aman — tidak ada tugas yang mepet (jarak < 45 menit) dan tidak ada hari padat (≥ 4 tugas).';
    let j = '';
    if (pasangan.length)
      j += `Mepet: ${pasangan.map(([a, b]) => `"${a.nama}" (${fmtJam(a.tenggat)}) dan "${b.nama}" (${fmtJam(b.tenggat)})`).join('; ')}. `;
    if (hariPadat.length) j += `Hari padat: ${hariPadat.map(([, v]) => `${v.length} tugas`).join(', ')}.`;
    return j.trim();
  }
  if (/mendesak|urgent|penting/.test(s)) {
    const m = aktif.filter((t) => t.urgensi === 'mendesak');
    if (!m.length) return 'Tidak ada tugas mendesak saat ini. Santai dulu.';
    return `Tugas mendesak (${m.length}): ${m.map((t) => `"${t.nama}" (${fmtJam(t.tenggat)})`).join(', ')}.`;
  }
  if (/ringkas|ringkasan|jadwal|semua|list/.test(s)) {
    if (!aktif.length) return 'Belum ada tugas aktif. Tulis rencanamu di atas dulu ya.';
    return `Ringkasan ${aktif.length} tugas: ${aktif.map((t) => `"${t.nama}" ${fmtJam(t.tenggat)} [${t.urgensi}]`).join('; ')}.`;
  }
  if (!/prioritas|dulu|dahulu|mana|urutan|kerjakan/.test(s))
    return 'Aku bisa membantu soal: prioritas pengerjaan, jadwal mepet, tugas mendesak, dan ringkasan jadwal. Coba tanya salah satunya ya.';
  if (!aktif.length) return 'Belum ada tugas aktif. Tulis rencanamu di atas dulu ya.';
  const u = urutkanSaran(aktif, nowMs);
  const [p1, p2, ...sisa] = u;
  const alasan = p1.urgensi === 'mendesak' ? 'paling mendesak' : 'tenggatnya paling dekat';
  let j = `Kerjakan "${p1.nama}" dulu karena ${alasan} (${fmtJam(p1.tenggat)}, ${p1.urgensi}).`;
  if (p2) j += ` Berikutnya "${p2.nama}" (${fmtJam(p2.tenggat)}).`;
  if (sisa.length) j += ` Masih ada ${sisa.length} tugas lain.`;
  return j;
}
