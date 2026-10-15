import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import History, { hitungKipas, pilihJarak } from './History.jsx';

afterEach(cleanup);

const t = (id, title, due_date, status = 'PENDING') => ({
  id,
  title,
  due_date,
  due_time: null,
  time_precision: 'UNSPECIFIED',
  urgency: 'LOW',
  priority: 'MEDIUM',
  status,
});

const tigaBulan = () => [
  t('s1', 'Arsip September', '2026-09-05', 'COMPLETED'),
  t('o1', 'Laporan Oktober', '2026-10-14'),
  t('o2', 'Apel Oktober', '2026-10-15', 'COMPLETED'),
  t('n1', 'Rencana November', '2026-11-02'),
];

describe('hitungKipas', () => {
  it('tengah penuh, samping miring', () => {
    expect(hitungKipas(2, 2)).toMatchObject({ s: 1 });
    expect(hitungKipas(2, 0).r).toBeLessThan(0);
    expect(hitungKipas(2, 4).r).toBeGreaterThan(0);
  });

  it('pilihJarak ringkas di layar kecil', () => {
    expect(pilihJarak(390)).toBe(58);
    expect(pilihJarak(1100)).toBe(92);
  });
});

describe('History fan', () => {
  it('klik kartu samping menjadikannya aktif', () => {
    render(<History daftar={tigaBulan()} awal="2026-10" />);
    fireEvent.click(screen.getByRole('button', { name: /september/i }));
    expect(screen.getByRole('button', { name: /september/i }).getAttribute('aria-current')).toBe('true');
  });

  it('memakai angka server bila onMuatBulan ada', async () => {
    const onMuatBulan = async (y, m) => {
      expect(y).toBe(2026);
      expect(m).toBe(10);
      return { total: 5, completed: 2, overdue: 1, cancelled: 0, completion_rate: 0.4, urgent: 0, byDay: {} };
    };
    render(<History daftar={tigaBulan()} awal="2026-10" onMuatBulan={onMuatBulan} />);
    await screen.findByText('5', { selector: '.folder-angka-big' });
  });
  it('panah dan keyboard menggeser; Enter di aktif membuka detail', () => {
    render(<History daftar={tigaBulan()} awal="2026-10" />);
    fireEvent.click(screen.getByLabelText(/bulan berikutnya/i));
    expect(screen.getByLabelText(/bulan aktif/i).textContent).toMatch(/november/i);
    expect(screen.getByLabelText(/bulan aktif/i).getAttribute('aria-live')).toBe('polite');
    fireEvent.keyDown(screen.getByLabelText(/kipas bulanan/i), { key: 'ArrowLeft' });
    expect(screen.getByLabelText(/bulan aktif/i).textContent).toMatch(/oktober/i);
    fireEvent.keyDown(screen.getByRole('button', { current: true }), { key: 'Enter' });
    const jumlah = document.querySelector('.riwayat-hari .jumlah');
    expect(jumlah && jumlah.textContent).toMatch(/tugas · .* selesai/i);
  });
});
