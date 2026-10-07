// api/lib/prioritas.js
export function tentukanUrgency(due, now = new Date()) {
  if (due == null) return 'LOW';
  const t = due instanceof Date ? due.getTime() : new Date(due).getTime();
  const n = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (Number.isNaN(t) || Number.isNaN(n)) return 'LOW';
  const selisih = t - n;
  if (selisih <= 2 * 3600e3) return 'URGENT';
  if (selisih <= 24 * 3600e3) return 'NORMAL';
  return 'LOW';
}

const KATA_PENTING = ['deadline', 'klien', 'skripsi', 'penting', 'mendesak', 'darurat', 'kumpul', 'ujian', 'wajib'];

export function saranPriority(judul) {
  const s = String(judul ?? '').toLowerCase();
  const kata = KATA_PENTING.find((k) => s.includes(k));
  if (kata) {
    return { priority: 'HIGH', source: 'AI', reason: `Prioritas tinggi — kata '${kata}'` };
  }
  return { priority: 'MEDIUM', source: 'SYSTEM', reason: 'Prioritas sedang — bawaan sistem' };
}
