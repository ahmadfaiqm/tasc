// client/src/lib/profil.js
// Sumber foto profil dari metadata Supabase + inisial cadangan bila tak ada foto.

export function fotoProfil(pengguna) {
  const meta = pengguna?.user_metadata ?? {};
  const url = meta.avatar_url || meta.picture || '';
  return String(url).trim() || null;
}

export function inisialProfil(nama, email) {
  const sumber = String(nama ?? '').trim() || String(email ?? '').trim();
  const huruf = sumber.replace(/[^0-9A-Za-zÀ-ÿ]/g, '')[0];
  return huruf ? huruf.toUpperCase() : '?';
}
