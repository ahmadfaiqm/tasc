// api/lib/auth.js
import { createHmac, timingSafeEqual, createPublicKey, verify as verifikasiCrypto } from 'node:crypto';

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

// Supabase modern menandatangani JWT dengan kunci asimetris (ES256/RS256).
// Kunci publik diambil dari JWKS proyek; kid pada header memilih kunci.
const JWKS_TTL_MS = 10 * 60 * 1000;
let cacheJwks = { waktu: 0, kunci: [] };

async function ambilJwks() {
  if (cacheJwks.kunci.length && Date.now() - cacheJwks.waktu < JWKS_TTL_MS) {
    return cacheJwks.kunci;
  }
  const basis = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
  if (!basis) return cacheJwks.kunci;
  try {
    const r = await fetch(`${basis}/auth/v1/.well-known/jwks.json`);
    if (!r.ok) return cacheJwks.kunci;
    const j = await r.json();
    const kunci = Array.isArray(j?.keys) ? j.keys : [];
    if (kunci.length) cacheJwks = { waktu: Date.now(), kunci };
    return cacheJwks.kunci;
  } catch {
    // Gagal jaringan: pakai cache lama bila ada (best-effort), jangan buka akses.
    return cacheJwks.kunci;
  }
}

export function resetJwksCache() {
  cacheJwks = { waktu: 0, kunci: [] };
}

function cocokkanKunci(token, jwk, alg) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [h, p, sig] = parts;
  if (!h || !p || !sig) return false;
  try {
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    const opsi = { key };
    // ES256 memakai signature mentah r||s (IEEE P1363); RS256 default PKCS#1 v1.5.
    if (alg === 'ES256') opsi.dsaEncoding = 'ieee-p1363';
    return verifikasiCrypto('sha256', Buffer.from(`${h}.${p}`), opsi, b64urlKeBuf(sig));
  } catch {
    return false;
  }
}

async function verifikasiAsimetris(token, header, alg) {
  const kunci = await ambilJwks();
  if (!kunci.length) return false;
  const cocok = kunci.filter((k) => k && k.kty);
  // Coba yang kid-nya cocok dulu, lalu sisanya (rotasi kunci).
  const urut = header.kid
    ? [...cocok.filter((k) => k.kid === header.kid), ...cocok.filter((k) => k.kid !== header.kid)]
    : cocok;
  return urut.some((k) => cocokkanKunci(token, k, alg));
}

export async function wajibAuth(req, res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'butuh login' });
  try {
    const [h64, p64, sig] = token.split('.');
    if (!h64 || !p64 || !sig) return res.status(401).json({ error: 'token invalid' });
    const header = JSON.parse(b64urlKeBuf(h64).toString('utf8'));
    const payload = JSON.parse(b64urlKeBuf(p64).toString('utf8'));
    const uid = payload.sub;
    if (!uid) return res.status(401).json({ error: 'token invalid' });
    if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
      if (Math.floor(Date.now() / 1000) > payload.exp) {
        return res.status(401).json({ error: 'token kedaluwarsa' });
      }
    }
    const alg = header.alg;
    if (alg === 'HS256') {
      // Produksi memakai kunci asimetris (ES256/RS256 di atas). HS256 ditolak
      // agar SUPABASE_JWT_SECRET yang keliru berisi key id (publik, ada di
      // JWKS) tidak bisa dipakai memalsukan token. Jalur HMAC hanya untuk
      // dev/test (atau proyek legacy yang masih benar-benar memakai HS256).
      if (process.env.NODE_ENV === 'production') {
        return res.status(401).json({ error: 'token invalid' });
      }
      const secret = process.env.SUPABASE_JWT_SECRET;
      if (secret && !verifikasiHmac(token, secret)) {
        return res.status(401).json({ error: 'token invalid' });
      }
    } else if (alg === 'ES256' || alg === 'RS256') {
      if (!(await verifikasiAsimetris(token, header, alg))) {
        return res.status(401).json({ error: 'token invalid' });
      }
    } else {
      return res.status(401).json({ error: 'token invalid' });
    }
    req.userId = uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'token invalid' });
  }
}
