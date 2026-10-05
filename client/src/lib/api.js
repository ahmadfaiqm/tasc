export const AI_TIMEOUT_MS = 8000;

export async function mintaParse(paragraf) {
  const base = import.meta.env.VITE_API_URL ?? '';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), AI_TIMEOUT_MS);
  try {
    const r = await fetch(`${base}/api/ai/parse`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        paragraf,
        now: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    });
    if (!r.ok) throw new Error('ai-' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}
