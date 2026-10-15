// api/lib/auth.js
import { createHmac, timingSafeEqual } from 'node:crypto';

function b64urlKeBuf(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

function verifikasiHmac(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [h, p, sig] = parts;
  if (!h || !p || !sig) return false;
  try {
    const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
    const aktual = b64urlKeBuf(sig);
    if (aktual.length !== expected.length) return false;
    return timingSafeEqual(aktual, expected);
  } catch {
    return false;
  }
}

export function wajibAuth(req, res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'butuh login' });
  // Bila SUPABASE_JWT_SECRET di-set (prod/staging): verifikasi signature HMAC-SHA256, tolak bila tak cocok.
  // Bila env kosong (dev/test): fallback ke decode payload saja seperti perilaku lama.
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    // Fail-closed di production: misconfig secret tidak boleh jadi akses terbuka.
    // Dev/test (NODE_ENV != production) tetap boleh decode seperti dulu.
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'auth belum dikonfigurasi' });
    }
  } else if (!verifikasiHmac(token, secret)) {
    return res.status(401).json({ error: 'token invalid' });
  }
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const uid = payload.sub;
    if (!uid) return res.status(401).json({ error: 'token invalid' });
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      if (Math.floor(Date.now() / 1000) > payload.exp) {
        return res.status(401).json({ error: 'token kedaluwarsa' });
      }
    }
    req.userId = uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'token invalid' });
  }
}
