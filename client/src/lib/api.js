import { susunTugas, tentukanUrgensi, jawabLokal } from './parserAturan.js';

const BASIS = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const lawan = async (path, badan) => {
  const r = await fetch(`${BASIS}/api${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badan),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};
const idAcak = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function lengkapi(members, now) {
  const nowMs = Date.parse(now);
  return members.map((t) => ({
    id: idAcak(), nama: t.nama, tenggat: t.tenggat,
    urgensi: t.urgensi || tentukanUrgensi(t.nama, Date.parse(t.tenggat), nowMs),
    selesai: false, reminded: false, created_at: now, updated_at: now,
  }));
}

function rakitLokal(paragraf) {
  const now = new Date().toISOString();
  return lengkapi(susunTugas(paragraf, now), now);
}

export async function parseParagraf(paragraf, paksaLokal = false) {
  if (paksaLokal) return { tasks: rakitLokal(paragraf), mode: 'lokal' };
  try {
    const j = await lawan('/ai/parse', { paragraf, now: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    if (j.mode === 'lokal' || !Array.isArray(j.tasks)) return { tasks: rakitLokal(paragraf), mode: 'lokal' };
    const now = new Date().toISOString();
    return { tasks: lengkapi(j.tasks, now), mode: j.mode || 'ai' };
  } catch {
    return { tasks: rakitLokal(paragraf), mode: 'lokal' };
  }
}

export async function kirimChat(pesan, tasks, paksaLokal = false) {
  if (paksaLokal) return { jawaban: jawabLokal(pesan, tasks, Date.now()), mode: 'lokal' };
  try {
    const j = await lawan('/ai/chat', { pesan, tasks });
    if (j.mode === 'lokal' || !j.jawaban) throw new Error('fallback lokal');
    return { jawaban: j.jawaban, mode: j.mode || 'ai' };
  } catch {
    return { jawaban: jawabLokal(pesan, tasks, Date.now()), mode: 'lokal' };
  }
}
