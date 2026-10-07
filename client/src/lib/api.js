// client/src/lib/api.js
// Semua data lewat API dengan Bearer JWT (PRD §60: tanpa query langsung dari browser).
// Token dari sesi Auth Supabase, fallback localStorage `taskman:token` (diisi saat login).
import { supabase } from './supabase.js';

export const AI_TIMEOUT_MS = 8000;

const KUNCI_TOKEN = 'taskman:token';

function basisApi() {
  return import.meta.env.VITE_API_URL ?? '';
}

export async function ambilToken() {
  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const t = data?.session?.access_token;
      if (t) {
        try {
          localStorage.setItem(KUNCI_TOKEN, t);
        } catch { /* abaikan */ }
        return t;
      }
    }
  } catch { /* jatuh ke fallback lokal */ }
  try {
    return localStorage.getItem(KUNCI_TOKEN) ?? '';
  } catch {
    return '';
  }
}

export function simpanToken(token) {
  try {
    if (token) localStorage.setItem(KUNCI_TOKEN, token);
    else localStorage.removeItem(KUNCI_TOKEN);
  } catch { /* abaikan */ }
}

async function panggilApi(path, { method = 'GET', body } = {}) {
  const token = await ambilToken();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const headers = { 'content-type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(`${basisApi()}${path}`, {
      method,
      signal: ctrl.signal,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`api-${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function zonaWaktu() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Asia/Jakarta';
  } catch {
    return 'Asia/Jakarta';
  }
}

// POST /api/ai/parse -> {sumber:'ai'|'lokal', tasks:[...]}.
// Gagal/timeout -> throw agar pemanggil jatuh ke parser lokal.
export async function mintaParse(paragraf) {
  return panggilApi('/api/ai/parse', {
    method: 'POST',
    body: { paragraf, now: new Date().toISOString(), timezone: zonaWaktu() },
  });
}

// POST /api/ai/chat (read-only) -> {jawaban, ...}.
export async function tanyaAsisten(pesan) {
  return panggilApi('/api/ai/chat', { method: 'POST', body: { pesan } });
}

// GET /api/tasks -> {tasks:[...]} (due_time selalu HH:MM|null hasil serialisasi).
export async function muatTasks(params = {}) {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.date) q.set('date', params.date);
  const akhir = q.toString() ? `?${q.toString()}` : '';
  return panggilApi(`/api/tasks${akhir}`);
}

// POST /api/tasks (dari kandidat preview yang dikonfirmasi).
export async function buatTask(payload) {
  return panggilApi('/api/tasks', { method: 'POST', body: payload });
}

// PATCH /api/tasks/:id.
export async function ubahTask(id, patch) {
  return panggilApi(`/api/tasks/${id}`, { method: 'PATCH', body: patch });
}

// DELETE /api/tasks/:id (soft delete).
export async function hapusTask(id) {
  return panggilApi(`/api/tasks/${id}`, { method: 'DELETE' });
}

// POST /api/tasks/:id/complete|cancel|reopen (lifecycle, idempoten).
export async function selesaikanTask(id) {
  return panggilApi(`/api/tasks/${id}/complete`, { method: 'POST', body: {} });
}

export async function batalkanTask(id) {
  return panggilApi(`/api/tasks/${id}/cancel`, { method: 'POST', body: {} });
}

export async function bukaUlangTask(id) {
  return panggilApi(`/api/tasks/${id}/reopen`, { method: 'POST', body: {} });
}

// GET /api/history/:y/:m -> {total, completed, overdue, cancelled, completion_rate, urgent, byDay}.
export async function riwayatBulan(year, month) {
  return panggilApi(`/api/history/${year}/${month}`);
}
