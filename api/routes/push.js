import express from 'express';

const router = express.Router();

function parseJwtSub(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString('utf8'));
    return payload.sub;
  } catch { return null; }
}

router.post('/subscribe', async (req, res) => {
  try {
    const jwt = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!jwt || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
      return res.json({ ok: true, tersimpan: false });
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates',
      },
      body: JSON.stringify({ user_id: parseJwtSub(jwt), subscription: req.body.subscription || {} }),
    });
    if (!r.ok) throw new Error(`Supabase HTTP ${r.status}`);
    return res.json({ ok: true, tersimpan: true });
  } catch {
    return res.json({ ok: true, tersimpan: false });
  }
});

export default router;
