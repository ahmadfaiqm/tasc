// api/lib/llmGratis.js — prompt structured output PRD §32, no-fake-time.
const AI_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `Kamu pengurai tugas Bahasa Indonesia menjadi JSON.
Aturan WAJIB:
- Jangan mengarang jam. Tanpa jam eksplisit -> due_time null dan time_precision "UNSPECIFIED".
- Pisahkan tiap aktivitas menjadi satu task. Judul bersih tanpa penanda waktu.
- Kembalikan HANYA JSON valid berbentuk {"tasks":[{title,description,due_date,due_time,time_precision,duration_minutes,urgency,priority,assumptions}]}.
- due_date format "YYYY-MM-DD" atau null bila tak disebut hari. due_time format "HH:MM" 24-jam atau null.
- time_precision salah satu EXACT (jam eksplisit), PERIOD (nanti sore/malam, pagi/siang tanpa jam pasti), UNSPECIFIED.
- duration_minutes hanya bila user menyebut durasi, else null. urgency/priority boleh disarankan, server yang memastikan.
- assumptions: daftar teks asumsi yang dibuat (misal tanggal tak disebut), boleh kosong.`;

export async function panggilLLM(paragraf, nowISO, timezone, fetchFn = fetch) {
  const base = process.env.AI_PROVIDER, key = process.env.AI_KEY, model = process.env.AI_MODEL;
  if (!base || !key || !model) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const r = await fetchFn(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.2, messages: [
        { role: 'system', content: `${SYSTEM_PROMPT} Sekarang ${nowISO} zona ${timezone ?? 'Asia/Jakarta'}. Jam yang sudah lewat hari ini berarti besok.` },
        { role: 'user', content: String(paragraf) }
      ]})
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : null;
    return tasks ?? null;
  } catch { return null; } finally { clearTimeout(t); }
}
