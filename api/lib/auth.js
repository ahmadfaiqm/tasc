// api/lib/auth.js
export function wajibAuth(req, res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'butuh login' });
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const uid = payload.sub;
    if (!uid) return res.status(401).json({ error: 'token invalid' });
    req.userId = uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'token invalid' });
  }
}
