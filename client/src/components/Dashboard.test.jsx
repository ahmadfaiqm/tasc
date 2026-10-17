import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Dashboard from './Dashboard.jsx';

afterEach(cleanup);

const dasar = {
  nama: 'Budi',
  email: 'budi@mail.com',
  onKeluar: () => {},
  tugas: <section aria-label="blok-tugas" />,
  rekap: <section aria-label="blok-rekap" />,
};

const renderDash = (extra = {}) => render(<Dashboard {...dasar} {...extra} />);

const bukaMenu = () => fireEvent.click(screen.getByRole('button', { name: /menu profil/i }));

describe('Dashboard', () => {
  it('tanpa tab: topbar, sapaan, tugas, lalu rekap berurutan', () => {
    renderDash();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText(/halo, budi/i)).toBeTruthy();
    const els = ['blok-tugas', 'blok-rekap'].map((n) => screen.getByLabelText(n));
    expect(els[0].compareDocumentPosition(els[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('menu baru muncul setelah avatar diklik', () => {
    renderDash();
    expect(screen.queryByRole('menu')).toBeNull();
    bukaMenu();
    expect(screen.getByRole('menuitem', { name: /pengaturan profil/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /keluar/i })).toBeTruthy();
  });

  it('Keluar di menu memanggil onKeluar', () => {
    const onKeluar = vi.fn();
    renderDash({ onKeluar });
    bukaMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /keluar/i }));
    expect(onKeluar).toHaveBeenCalledTimes(1);
  });

  it('Pengaturan profil membuka dialog berisi nama dan alamat email', () => {
    renderDash();
    bukaMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    expect(screen.getByRole('dialog', { name: /pengaturan profil/i }).textContent).toContain('budi@mail.com');
    expect(screen.getByLabelText(/^nama$/i).value).toBe('Budi');
  });

  it('Simpan memanggil onUbahNama dengan nama baru lalu menutup dialog', async () => {
    const onUbahNama = vi.fn(async () => true);
    renderDash({ onUbahNama });
    bukaMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    fireEvent.change(screen.getByLabelText(/^nama$/i), { target: { value: 'Ani' } });
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }));
    await waitFor(() => expect(onUbahNama).toHaveBeenCalledWith('Ani'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('dialog tetap terbuka bila penyimpanan nama gagal', async () => {
    const onUbahNama = vi.fn(async () => false);
    renderDash({ onUbahNama });
    bukaMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }));
    await waitFor(() => expect(onUbahNama).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('Batal menutup dialog tanpa menyimpan nama', () => {
    const onUbahNama = vi.fn();
    renderDash({ onUbahNama });
    bukaMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    fireEvent.click(screen.getByRole('button', { name: /batal/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onUbahNama).not.toHaveBeenCalled();
  });

  it('Escape menutup dialog', () => {
    renderDash();
    bukaMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('avatar memakai foto dari akun Google bila ada', () => {
    renderDash({ foto: 'https://x/a.png' });
    const img = screen.getByRole('button', { name: /menu profil/i }).querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://x/a.png');
  });

  it('avatar memakai inisial nama bila tidak ada foto', () => {
    renderDash();
    expect(screen.getByText('B')).toBeTruthy();
  });
});
