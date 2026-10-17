import { describe, it, expect } from 'vitest';
import { fotoProfil, inisialProfil } from './profil.js';

describe('fotoProfil', () => {
  it('pakai avatar_url dari metadata Supabase', () => {
    expect(fotoProfil({ user_metadata: { avatar_url: 'https://x/a.png' } })).toBe('https://x/a.png');
  });

  it('pakai picture bila avatar_url kosong (Google menaruh dua-duanya)', () => {
    expect(fotoProfil({ user_metadata: { avatar_url: '', picture: 'https://x/p.png' } })).toBe('https://x/p.png');
  });

  it('null bila pengguna atau fotonya tidak ada', () => {
    expect(fotoProfil(null)).toBeNull();
    expect(fotoProfil({ user_metadata: {} })).toBeNull();
    expect(fotoProfil({})).toBeNull();
  });
});

describe('inisialProfil', () => {
  it('huruf pertama nama, dihurufbesarkan', () => {
    expect(inisialProfil('ani')).toBe('A');
  });

  it('pakai email bila nama kosong', () => {
    expect(inisialProfil('', 'budi@mail.com')).toBe('B');
  });

  it('"?" bila tidak ada nama maupun email', () => {
    expect(inisialProfil('', '')).toBe('?');
    expect(inisialProfil()).toBe('?');
  });
});
