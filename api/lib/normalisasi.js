// api/lib/normalisasi.js — samakan keluaran LLM -> kontrak PRD.
// Backend memastikan urgency/priority; AI hanya suggest. Tanpa jam -> null (no-fake-time).
import { tentukanUrgency, saranPriority } from './prioritas.js';

const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRECISION = ['EXACT', 'PERIOD', 'UNSPECIFIED'];

// Terima Date (kolom @db.Time dari Prisma), string HH:MM, atau null -> "HH:MM"|null.
// Dipakai agar wire selalu HH:MM, bukan ISO 1970 mentah.
export function formatJam(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    const h = String(v.getUTCHours()).padStart(2, '0');
    const m = String(v.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
  const s = String(v).trim();
  if (JAM.test(s)) return s;
  const m = s.match(/^(\d{1,2})[.:](\d{2})$/);
  if (m) {
    const h = Number(m[1]), mn = Number(m[2]);
    if (h >= 0 && h <= 23 && mn >= 0 && mn <= 59) {
      return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
    }
  }
  return null;
}

function keTanggal(s) {
  if (s == null) return null;
  const str = String(s).trim();
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Serialisasi baris task Prisma ke wire: due_time selalu HH:MM|null.
export function serialkanTask(t) {
  if (!t || typeof t !== 'object') return t;
  return { ...t, dueTime: formatJam(t.dueTime ?? null) };
}

export function normalisasiTugas(arr, nowISO) {
  if (!Array.isArray(arr)) return [];
  const now = nowISO ? new Date(nowISO) : new Date();
  const out = [];
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const title = String(item.title ?? item.nama ?? '').trim().slice(0, 255);
    if (!title) continue;
    const dueDate = keTanggal(item.due_date ?? item.dueDate ?? null);
    const dueTime = formatJam(item.due_time ?? item.dueTime ?? null);
    let precision = item.time_precision ?? item.timePrecision ?? 'UNSPECIFIED';
    if (!PRECISION.includes(precision)) precision = 'UNSPECIFIED';
    if (dueTime == null && precision === 'EXACT') precision = 'UNSPECIFIED';
    const dur = item.duration_minutes ?? item.durationMinutes ?? null;
    const durationMinutes = Number.isInteger(dur) && dur > 0 ? dur : null;
    const due = dueDate && dueTime
      ? new Date(`${dueDate}T${dueTime}:00`)
      : dueDate ? new Date(`${dueDate}T00:00:00`) : null;
    const urgency = tentukanUrgency(due, now);
    const saran = saranPriority(title);
    const priority = ['HIGH', 'MEDIUM', 'LOW'].includes(item.priority) ? item.priority : saran.priority;
    const ps = item.priority_source ?? item.prioritySource ?? null;
    const prioritySource = ['USER', 'AI', 'SYSTEM'].includes(ps) ? ps : (['HIGH', 'MEDIUM', 'LOW'].includes(item.priority) ? 'AI' : saran.source);
    const asumsi = Array.isArray(item.assumptions)
      ? item.assumptions.map((a) => String(a).trim()).filter(Boolean)
      : [];
    out.push({
      title,
      description: item.description != null ? String(item.description) : null,
      source_text: item.source_text ?? item.sourceText ?? null,
      due_date: dueDate,
      due_time: dueTime,
      time_precision: precision,
      duration_minutes: durationMinutes,
      urgency,
      priority,
      priority_source: prioritySource,
      assumptions: asumsi,
    });
  }
  return out;
}
