const MODEL = 'gpt-4o-mini';

async function panggilOpenAI(messages, { json = true } = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY kosong');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL, messages,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        temperature: 0.2,
      }),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`);
    const j = await r.json();
    return j.choices[0].message.content;
  } finally {
    clearTimeout(timer);
  }
}

export { panggilOpenAI };
