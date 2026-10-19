// api/lib/auth.test.js
// Penjaga kelas bug: Supabase kini menandatangani JWT dengan kunci asimetris
// (ES256/RS256, JWKS) sedangkan auth lama hanya memverifikasi HMAC-SHA256.
// Akibat nyata: token user asli ditolak 401 -> provision profil gagal ->
// POST /api/tasks melanggar FK / selalu gagal ("task baru tak bisa ditambah").
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { generateKeyPairSync, createSign, createHmac } from 'node:crypto';
import { wajibAuth, resetJwksCache } from './auth.js';

const KID = '07c26cfe-3d73-47b2-8556-b964bcc34d62';
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const jwkPublic = { ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'ES256', use: 'sig' };

// Kunci penyerang (proyek lain) untuk uji tolak.
const penyerang = generateKeyPairSync('ec', { namedCurve: 'P-256' });

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buatEs256(sub, { kid = KID, rusak = false, kunci = privateKey } = {}) {
  const h = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid }));
  const p = b64url(JSON.stringify({ sub, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 }));
  const s = createSign('SHA256');
  s.update(`${h}.${p}`);
  s.end();
  const sig = s.sign({ key: kunci, dsaEncoding: 'ieee-p1363' });
  const sigStr = b64url(sig);
  return `${h}.${p}.${rusak ? `${sigStr.slice(0, -4)}AAAA` : sigStr}`;
}

function buatHs256(sub, secret) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + 3600 }));
  return `${h}.${p}.${b64url(createHmac('sha256', secret).update(`${h}.${p}`).digest())}`;
}

// Jalankan middleware apa adanya (sync atau async) dan tangkap keputusannya.
function jalankan(token) {
  return new Promise((resolve) => {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json() { resolve({ lolos: false, status: this.statusCode }); return this; },
    };
    const next = () => resolve({ lolos: true, userId: req.userId });
    try {
      const p = wajibAuth(req, res, next);
      if (p && typeof p.then === 'function') p.catch(() => resolve({ lolos: false, status: 500 }));
    } catch {
      resolve({ lolos: false, status: 500 });
    }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetJwksCache();
  delete process.env.SUPABASE_JWT_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.NODE_ENV;
});

describe('wajibAuth — token asimetris Supabase (ES256 via JWKS)', () => {
  beforeEach(() => {
    resetJwksCache();
    process.env.SUPABASE_URL = 'https://contoh.supabase.co';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ keys: [jwkPublic] }),
    })));
  });

  it('menerima token ES256 valid dan mengisi req.userId', async () => {
    const hasil = await jalankan(buatEs256('user-es256'));
    expect(hasil).toEqual({ lolos: true, userId: 'user-es256' });
  });

  it('produksi: secret HS256 di-set pun token ES256 asli tetap diterima', async () => {
    // Inilah kondisi nyata: SUPABASE_JWT_SECRET terisi (dianggap HS256) padahal
    // token Supabase ditandatangani ES256 -> kode lama 401, kode baru lolos.
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_JWT_SECRET = KID;
    const hasil = await jalankan(buatEs256('user-asli'));
    expect(hasil).toEqual({ lolos: true, userId: 'user-asli' });
  });

  it('menolak token ES256 yang signature-nya dirusak', async () => {
    const hasil = await jalankan(buatEs256('user-es256', { rusak: true }));
    expect(hasil.lolos).toBe(false);
    expect(hasil.status).toBe(401);
  });

  it('menolak token ES256 yang ditandatangani kunci proyek lain', async () => {
    const hasil = await jalankan(buatEs256('user-penyerang', { kunci: penyerang.privateKey, kid: 'kid-lain' }));
    expect(hasil.status).toBe(401);
  });

  it('menerima token ES256 valid walau kid tak cocok (fallback rotasi kunci)', async () => {
    const hasil = await jalankan(buatEs256('user-rotasi', { kid: 'kid-baru' }));
    expect(hasil).toEqual({ lolos: true, userId: 'user-rotasi' });
  });
});

describe('wajibAuth — jalur HMAC lama tetap jalan', () => {
  it('menerima HS256 valid saat secret di-set', async () => {
    process.env.SUPABASE_JWT_SECRET = 'rahasia-uji';
    const hasil = await jalankan(buatHs256('user-hs256', 'rahasia-uji'));
    expect(hasil).toEqual({ lolos: true, userId: 'user-hs256' });
  });

  it('menolak HS256 ber-signature salah saat secret di-set', async () => {
    process.env.SUPABASE_JWT_SECRET = 'rahasia-uji';
    const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const p = b64url(JSON.stringify({ sub: 'user-palsu', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const hasil = await jalankan(`${h}.${p}.c2lnbmF0dXJlLXNhbGFo`);
    expect(hasil.status).toBe(401);
  });

  it('menolak token kedaluwarsa', async () => {
    process.env.SUPABASE_JWT_SECRET = 'rahasia-uji';
    const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const p = b64url(JSON.stringify({ sub: 'user-basi', exp: Math.floor(Date.now() / 1000) - 10 }));
    const hasil = await jalankan(`${h}.${p}.${b64url(createHmac('sha256', 'rahasia-uji').update(`${h}.${p}`).digest())}`);
    expect(hasil.status).toBe(401);
  });

  it('produksi: HS256 ditolak (cegah forgery via secret yang sebenarnya key id publik)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_JWT_SECRET = KID;
    const hasil = await jalankan(buatHs256('user-forged', KID));
    expect(hasil.status).toBe(401);
  });
});
