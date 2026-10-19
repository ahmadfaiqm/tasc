// api/lib/llmGratis.js — prompt structured output PRD §32, no-fake-time.
// Model "lite" menjawab ~2 dtk; beri ruang bila provider menyarankan model
// pengganti yang lebih berat (reasoning ~9 dtk).
const AI_TIMEOUT_MS = 15000;

// Nama penyedia ramah -> basis endpoint gaya-OpenAI. Nilai AI_PROVIDER yang
// sudah berupa URL (mengandung "://") dipakai apa adanya. Mapping ini membuat
// nilai lama seperti "gemini" tetap bekerja tanpa harus mengubah env.
const BASIS_PROVIDER = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
};

export function basisProvider(nilai) {
  const s = String(nilai ?? '').trim().replace(/\/+$/, '');
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return BASIS_PROVIDER[s.toLowerCase()] ?? s;
}

// Provider (mis. Google Gemini) menolak model pensiun dengan 404 dan menyebut
// penggantinya di pesan ("... use models/gemini-3.8-flash ..."). Ambil model
// yang BEDA dari yang sedang dipakai agar tak perlu ubah env tiap model ganti.
export function modelPengganti(teks, sekarang) {
  const semua = [...String(teks ?? '').matchAll(/models\/([A-Za-z0-9._-]+)/g)].map((m) => m[1]);
  return semua.find((m) => m !== sekarang) ?? null;
}

const SYSTEM_PROMPT = `Kamu pengurai tugas Bahasa Indonesia menjadi JSON.
Aturan WAJIB:
- Jangan mengarang jam. Tanpa jam eksplisit -> due_time null dan time_precision "UNSPECIFIED".
- Pisahkan tiap aktivitas menjadi satu task. Judul bersih tanpa penanda waktu.
- Kembalikan HANYA JSON valid berbentuk {"tasks":[{title,description,due_date,due_time,time_precision,duration_minutes,urgency,priority,assumptions}]}.
- due_date format "YYYY-MM-DD" atau null bila tak disebut hari. due_time format "HH:MM" 24-jam atau null.
- time_precision salah satu EXACT (jam eksplisit), PERIOD (nanti sore/malam, pagi/siang tanpa jam pasti), UNSPECIFIED.
- duration_minutes hanya bila user menyebut durasi, else null. urgency/priority boleh disarankan, server yang memastikan.
- assumptions: daftar teks asumsi yang dibuat (misal tanggal tak disebut), boleh kosong.`;

function kirimChat(base, key, model, messages, signal, fetchFn) {
  return fetchFn(`${base}/chat/completions`, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, temperature: 0.2, messages }),
  });
}

export async function panggilLLM(paragraf, nowISO, timezone, fetchFn = fetch) {
  const base = basisProvider(process.env.AI_PROVIDER);
  const key = process.env.AI_KEY;
  const modelAwal = process.env.AI_MODEL;
  if (!base || !key || !modelAwal) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  const messages = [
    { role: 'system', content: `${SYSTEM_PROMPT} Sekarang ${nowISO} zona ${timezone ?? 'Asia/Jakarta'}. Jam yang sudah lewat hari ini berarti besok.` },
    { role: 'user', content: String(paragraf) },
  ];
  try {
    let r = await kirimChat(base, key, modelAwal, messages, ctrl.signal, fetchFn);
    if (!r.ok) {
      // Model dipensiunkan? Coba sekali dengan model pengganti yang disarankan.
      const teks = await r.text().catch(() => '');
      const ganti = modelPengganti(teks, modelAwal);
      if (!ganti) return null;
      r = await kirimChat(base, key, ganti, messages, ctrl.signal, fetchFn);
      if (!r.ok) return null;
    }
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : null;
    return tasks ?? null;
  } catch { return null; } finally { clearTimeout(t); }
}
