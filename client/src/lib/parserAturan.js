// client/src/lib/parserAturan.js
// Rewrite PRD: no-fake-time. Tanpa jam -> due_time null + UNSPECIFIED.

export const REMINDER_MIN = 5;

const HARI_IDX = {
  minggu: 0, ahad: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, 'jumat': 5, 'jum at': -1, sabtu: 6,
};

function offsetHari(teks, now) {
  const t = String(teks).toLowerCase();
  if (/\bhari ini\b/.test(t)) return { offset: 0, adaHari: true };
  if (/\bbesok\b/.test(t)) return { offset: 1, adaHari: true };
  if (/\blusa\b/.test(t)) return { offset: 2, adaHari: true };
  if (/akhir pekan|akhir minggu|weekend/.test(t)) {
    const delta = (6 - now.getDay() + 7) % 7;
    return { offset: delta, adaHari: true };
  }
  const m = t.match(/\b(senin|selasa|rabu|kamis|jum['`]?at|jumat|sabtu|minggu|ahad)\b/);
  if (m) {
    const key = m[1].replace(/['`]/g, '');
    const target = HARI_IDX[key] ?? HARI_IDX[key.toLowerCase()];
    if (target !== undefined && target >= 0) {
      const delta = (target - now.getDay() + 7) % 7;
      return { offset: delta, adaHari: true };
    }
  }
  return { offset: 0, adaHari: false };
}

function terapkanPm(h, penanda) {
  const p = String(penanda ?? '').toLowerCase();
  if ((p === 'sore' || p === 'malam') && h >= 1 && h <= 11) return h + 12;
  if (p === 'malam' && h === 12) return 0;
  if (p === 'pagi' && h === 12) return 0;
  return h;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function parseJamSegment(seg) {
  let m;
  // setengah H (+ penanda): "setengah 4 sore" -> (4-1):30 + pm = 15:30
  if ((m = seg.match(/setengah\s*(\d{1,2})(?:\s*(pagi|siang|sore|malam|subuh))?/i))) {
    let h = parseInt(m[1], 10) - 1;
    if (h < 0) h = 0;
    h = terapkanPm(h === 0 ? 12 : h, m[2]);
    if (h === 12 && !m[2]) { /* tengah malam nuansa, biarkan */ }
    // terapkanPm(12,...) bila h awal 0 -> 12; "setengah 1" -> 00:30
    let hh = parseInt(m[1], 10) - 1;
    hh = terapkanPm(hh < 0 ? 0 : hh, m[2]);
    // normalisasi: bila hasil 24+ ? tidak mungkin
    return { kind: 'exact', h: hh, mnt: 30 };
  }
  // jam|pukul H[:.]MM (+ penanda)
  if ((m = seg.match(/(?:jam|pukul)\s*(\d{1,2})(?:[.:](\d{2}))?(?:\s*(pagi|siang|sore|malam|subuh))?/i))) {
    let h = parseInt(m[1], 10);
    const mnt = m[2] !== undefined ? parseInt(m[2], 10) : 0;
    if (h > 23 || mnt > 59) return { kind: 'none' };
    h = terapkanPm(h, m[3]);
    return { kind: 'exact', h, mnt };
  }
  // N menit/jam lagi (relatif, exact dari now)
  if ((m = seg.match(/(\d+)\s*menit\s+lagi/i))) {
    return { kind: 'relatif', tambahMs: parseInt(m[1], 10) * 60e3 };
  }
  if ((m = seg.match(/(\d+)\s*jam\s+lagi/i))) {
    return { kind: 'relatif', tambahMs: parseInt(m[1], 10) * 3600e3 };
  }
  // nanti sore/malam/siang/pagi -> PERIOD
  if (/nanti\s*(sore|malam|siang|pagi)/i.test(seg)) return { kind: 'period' };
  // periode telanjang: siang/sore/malam/pagi (+ -nya)
  if (/\b(siang(nya|hari)?|sore(nya)?|malam(nya|hari)?|pagi(nya|hari)?|subuh)\b/i.test(seg)) {
    return { kind: 'period' };
  }
  return { kind: 'none' };
}

function parseDurasi(seg) {
  const m = seg.match(/(?:selama|durasi)\s*(\d+)\s*(menit|jam)/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return /jam/i.test(m[2]) ? n * 60 : n;
}

function bersihkanJudul(seg) {
  let s = String(seg);
  s = s.replace(/setengah\s*\d{1,2}(?:\s*(?:pagi|siang|sore|malam|subuh))?/gi, ' ');
  s = s.replace(/(?:jam|pukul)\s*\d{1,2}(?:[.:]\d{2})?(?:\s*(?:pagi|siang|sore|malam|subuh))?/gi, ' ');
  s = s.replace(/\b\d+\s*(?:menit|jam)\s+lagi\b/gi, ' ');
  s = s.replace(/\b(?:selama|durasi)\s*\d+\s*(?:menit|jam)\b/gi, ' ');
  s = s.replace(/\bhari ini\b|\bbesok\b|\blusa\b/gi, ' ');
  s = s.replace(/\b(senin|selasa|rabu|kamis|jum['`]?at|jumat|sabtu|minggu|ahad)\b/gi, ' ');
  s = s.replace(/\bakhir pekan\b|\bakhir minggu\b|\bweekend\b/gi, ' ');
  s = s.replace(/\bnanti\s*(?:sore|malam|siang|pagi)\b/gi, ' ');
  // periode telanjang hanya bila bukan satu-satunya kata bermakna? buang agar judul bersih
  s = s.replace(/\b(siangnya|sor enya|sorenya|malamnya|paginya)\b/gi, ' ');
  s = s.replace(/\s+/g, ' ').replace(/^[\s,.;:—-]+|[\s,.;:—-]+$/g, '').trim();
  // buang penanda periode sisa yang berdiri sendiri di awal ("siangnya beli sepatu" -> "beli sepatu")
  s = s.replace(/^(siang|sore|malam|pagi|subuh)\b\s*/i, '').trim();
  return s;
}

export function tentukanUrgency(due, now = new Date()) {
  if (!due) return 'LOW';
  const d = new Date(due).getTime() - new Date(now).getTime();
  if (d <= 2 * 3600e3) return 'URGENT';
  if (d <= 24 * 3600e3) return 'NORMAL';
  return 'LOW';
}

const HIGH_RE = /(deadline|klien|skripsi|penting|mendesak|darurat|urgent|kumpul|segera)/i;
const LOW_RE = /\b(santai|kapan-kapan|tidak penting|nanti saja|nanti aja|rendah)\b/i;

export function saranPriority(nama = '') {
  const t = String(nama);
  const hm = t.match(HIGH_RE);
  if (hm) {
    return { priority: 'HIGH', source: 'AI', reason: `Prioritas tinggi — kata '${hm[1].toLowerCase()}'` };
  }
  const lm = t.match(LOW_RE);
  if (lm) {
    return { priority: 'LOW', source: 'AI', reason: `Prioritas rendah — kata '${lm[1].toLowerCase()}'` };
  }
  return { priority: 'MEDIUM', source: 'SYSTEM', reason: 'Prioritas standar sistem' };
}

function tanggalTengahMalam(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function parseParagraf(paragraf, now = new Date()) {
  const skrg = new Date(now);
  const parts = String(paragraf)
    .split(/[\n;]+|\.(?!\d)|,(?!\d)|\s+lalu\s+|\s+kemudian\s+|\s+terus\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.map((seg) => {
    const source_text = seg;
    const { offset, adaHari } = offsetHari(seg, skrg);
    const jam = parseJamSegment(seg);
    const duration_minutes = parseDurasi(seg);
    const assumptions = [];
    if (!adaHari) assumptions.push('tanggal tidak disebut, dianggap hari ini');

    let due_date;
    let due_time = null;
    let time_precision = 'UNSPECIFIED';

    if (jam.kind === 'relatif') {
      const target = new Date(skrg.getTime() + jam.tambahMs);
      due_date = tanggalTengahMalam(target);
      // tanggal relatif bisa pindah hari: sinkronkan offset hari aktual
      due_time = `${pad2(target.getHours())}:${pad2(target.getMinutes())}`;
      time_precision = 'EXACT';
    } else if (jam.kind === 'exact') {
      time_precision = 'EXACT';
      due_time = `${pad2(jam.h)}:${pad2(jam.mnt)}`;
      const base = new Date(skrg);
      base.setDate(base.getDate() + offset);
      base.setHours(jam.h, jam.mnt, 0, 0);
      if (!adaHari && base.getTime() <= skrg.getTime()) {
        base.setDate(base.getDate() + 1);
      }
      due_date = tanggalTengahMalam(base);
    } else if (jam.kind === 'period') {
      time_precision = 'PERIOD';
      due_time = null;
      assumptions.push('waktu hanya periode (pagi/siang/sore/malam), jam belum ditentukan');
      const base = new Date(skrg);
      base.setDate(base.getDate() + offset);
      due_date = tanggalTengahMalam(base);
    } else {
      time_precision = 'UNSPECIFIED';
      due_time = null;
      const base = new Date(skrg);
      base.setDate(base.getDate() + offset);
      due_date = tanggalTengahMalam(base);
    }

    let title = bersihkanJudul(seg);
    if (!title) title = seg.trim();
    const description = '';

    return { title, description, source_text, due_date, due_time, time_precision, duration_minutes, assumptions };
  });
}

const BOBOT_PRIORITY = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const BOBOT_URGENCY = { URGENT: 0, NORMAL: 1, LOW: 2 };

function tanggalWaktu(t, now) {
  const base = t.due_date ? new Date(t.due_date) : (t.tenggat ? new Date(t.tenggat) : new Date(8640000000000000));
  if (t.due_time && /^\d{2}:\d{2}$/.test(t.due_time)) {
    const [h, m] = t.due_time.split(':').map(Number);
    base.setHours(h, m, 0, 0);
  }
  return base.getTime();
}

export function saranUrutan(tasks, now = new Date()) {
  const diperkaya = (tasks ?? []).map((t) => {
    const priority = t.priority ?? saranPriority(t.title ?? t.nama ?? '').priority;
    let urgency = t.urgency ?? t.urgensi;
    if (!urgency) {
      const dt = t.due_date ?? t.tenggat ?? null;
      let penuh = dt ? new Date(dt) : null;
      if (penuh && t.due_time && /^\d{2}:\d{2}$/.test(t.due_time)) {
        const [h, m] = t.due_time.split(':').map(Number);
        penuh = new Date(penuh);
        penuh.setHours(h, m, 0, 0);
      }
      urgency = tentukanUrgency(penuh ?? new Date(8640000000000000), now);
    }
    // normalisasi urgensi lama bila ada
    if (urgency === 'Mendesak') urgency = 'URGENT';
    else if (urgency === 'Sedang') urgency = 'NORMAL';
    else if (urgency === 'Santai') urgency = 'LOW';
    return { ...t, priority, urgency };
  });
  const s = [...diperkaya].sort((a, b) =>
    ((BOBOT_PRIORITY[a.priority] ?? 1) - (BOBOT_PRIORITY[b.priority] ?? 1)) ||
    ((BOBOT_URGENCY[a.urgency] ?? 1) - (BOBOT_URGENCY[b.urgency] ?? 1)) ||
    (tanggalWaktu(a, now) - tanggalWaktu(b, now)) ||
    ((a.duration_minutes ?? 1e9) - (b.duration_minutes ?? 1e9)),
  );
  if (!s.length) return { pertama: '', alasan: '', kedua: '', sisa: [] };
  const nama = (t) => t.title ?? t.nama ?? '';
  const alasanPertama = s[0].urgency === 'URGENT'
    ? 'tenggat mepet / prioritas tinggi'
    : 'prioritas tertinggi & tenggat paling dekat';
  return {
    pertama: nama(s[0]),
    alasan: alasanPertama,
    kedua: s[1] ? nama(s[1]) : '',
    sisa: s.slice(2).map(nama),
  };
}
