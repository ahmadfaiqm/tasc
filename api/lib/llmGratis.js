export async function panggilLLM(paragraf, nowISO, timezone, fetchFn = fetch) {
  const base = process.env.AI_PROVIDER, key = process.env.AI_KEY, model = process.env.AI_MODEL;
  if (!base || !key || !model) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetchFn(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.2, messages: [
        { role: 'system', content: `Ubah paragraf Bahasa Indonesia menjadi JSON {tugas:[{nama,tenggat}]}. Sekarang ${nowISO} zona ${timezone}. Jam yang lewat hari ini berarti besok. Balas JSON saja.` },
        { role: 'user', content: paragraf }
      ]})
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? '[]';
    const m = txt.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]).tugas ?? null : null;
  } catch { return null; } finally { clearTimeout(t); }
}
