// client/src/lib/parserAturan.js
const KATA_MENDESAK = /(mendesak|segera|penting|deadline|klien|darurat|urgent)/i;
export function tentukanUrgensi(tenggat, now, nama = '') {
  const d = tenggat.getTime() - now.getTime();
  if (d <= 2 * 3600e3 || KATA_MENDESAK.test(nama)) return 'Mendesak';
  if (d <= 24 * 3600e3) return 'Sedang';
  return 'Santai';
}
function aturJam(base, h, m, rollover = true) {
  const d = new Date(base); d.setHours(h, m, 0, 0);
  if (rollover && d.getTime() <= base.getTime()) d.setDate(d.getDate() + 1);
  return d;
}
function offsetHariDari(teks) {
  const m = teks.match(/hari ini|besok|lusa/i);
  if (!m) return 0;
  const w = m[0].toLowerCase();
  return w === 'besok' ? 1 : w === 'lusa' ? 2 : 0;
}
export function parseParagraf(paragraf, now = new Date()) {
  const parts = String(paragraf)
    .split(/[\n;]+|\.(?!\d)|,(?!\d)|\s+lalu\s+|\s+kemudian\s+|\s+terus\s+/i)
    .map(s => s.trim()).filter(Boolean);
  let berantai = new Date(now.getTime() + 30 * 60e3);
  let prev = null;
  return parts.map((p) => {
    const off = offsetHariDari(p);
    const baseHari = new Date(now);
    if (off) baseHari.setDate(baseHari.getDate() + off);
    let t = null;
    let m = p.match(/(?:jam|pukul)\s*(\d{1,2})(?:[.:](\d{2}))?/i);
    if (m) {
      t = off ? aturJam(baseHari, +m[1], +(m[2] ?? 0), false) : aturJam(now, +m[1], +(m[2] ?? 0), true);
    } else if ((m = p.match(/(\d+)\s*menit\s+lagi/i))) {
      const anchor = prev ?? now;
      t = new Date(anchor.getTime() + (+m[1]) * 60e3);
      if (off) t.setDate(t.getDate() + off);
    } else if ((m = p.match(/(\d+)\s*jam\s+lagi/i))) {
      const anchor = prev ?? now;
      t = new Date(anchor.getTime() + (+m[1]) * 3600e3);
      if (off) t.setDate(t.getDate() + off);
    } else {
      t = new Date(berantai);
      if (off) t.setDate(t.getDate() + off);
      berantai = new Date(berantai.getTime() + 30 * 60e3);
    }
    prev = t;
    if (t.getTime() >= berantai.getTime()) berantai = new Date(t.getTime() + 30 * 60e3);
    return { nama: p.replace(/(?:jam|pukul)\s*\d{1,2}(?:[.:]\d{2})?/i, '').trim() || p, tenggat: t };
  });
}
const BOBOT = { Mendesak: 0, Sedang: 1, Santai: 2 };
export function saranUrutan(tasks, now = new Date()) {
  const s = [...tasks].sort((a, b) => (BOBOT[a.urgensi] - BOBOT[b.urgensi]) || (a.tenggat - b.tenggat));
  if (!s.length) return { pertama: '', alasan: '', kedua: '', sisa: [] };
  return {
    pertama: s[0].nama,
    alasan: s[0].urgensi === 'Mendesak' ? 'tenggat mepet / kata penting' : 'tenggat paling dekat',
    kedua: s[1]?.nama ?? '',
    sisa: s.slice(2).map(x => x.nama)
  };
}
export const REMINDER_MIN = 5;
