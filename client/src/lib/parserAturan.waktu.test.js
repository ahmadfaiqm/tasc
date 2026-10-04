import { describe, it, expect } from 'vitest';
import { splitParagraf, susunTugas } from './parserAturan.js';

// Tes berjalan di TZ=Asia/Jakarta (lihat vite.config test.env). Basis = 14:00 WIB.
const ISO = '2026-10-04T07:00:00.000Z';

describe('splitParagraf', () => {
  it('pecah pada titik, koma, baris baru, lalu/kemudian', () => {
    const out = splitParagraf('Rapat jam 9. lalu makan siang, kemudian tidur\nmalam nonton');
    expect(out).toEqual(['Rapat jam 9', 'makan siang', 'tidur', 'malam nonton']);
  });
});

describe('susunTugas', () => {
  it('jam absolut hari ini yang masih akan datang', () => {
    const [t] = susunTugas('Rapat jam 9 malam', ISO);
    expect(t.nama).toBe('Rapat jam 9 malam');
    expect(t.tenggat).toBe('2026-10-04T14:00:00.000Z'); // 21:00 WIB
  });
  it('jam yang sudah lewat tanpa penanda hari dianggap besok', () => {
    const [t] = susunTugas('Rapat jam 9 pagi', ISO);
    expect(t.tenggat).toBe('2026-10-05T02:00:00.000Z'); // 09:00 WIB besok
  });
  it('relatif 30 menit lagi dan hari besok/lusa menempel ke depan', () => {
    const out = susunTugas('Bayar listrik 30 menit lagi. Besok kirim laporan jam 10, lusa presentasi', ISO);
    expect(out[0].tenggat).toBe('2026-10-04T07:30:00.000Z');
    expect(out[1].tenggat).toBe('2026-10-05T03:00:00.000Z'); // jam 10 WIB = 03:00 UTC
    expect(out[2].tenggat).toBe('2026-10-05T03:30:00.000Z'); // FIX R7: tanpa jam = +30 mnt berantai
  });
  it('tanpa jam diberi +30 menit berantai', () => {
    const out = susunTugas('Beli susu. Beli roti', ISO);
    expect(out[0].tenggat).toBe('2026-10-04T07:30:00.000Z');
    expect(out[1].tenggat).toBe('2026-10-04T08:00:00.000Z');
  });
});
