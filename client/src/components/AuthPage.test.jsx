import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AuthPage from './AuthPage.jsx';

afterEach(cleanup);

function pasang(override = {}) {
  const props = { onMasuk: vi.fn(), onDaftar: vi.fn(), onGoogle: vi.fn(), onTamu: vi.fn(), galat: '', sibuk: false, namaAwal: '', ...override };
  render(<AuthPage {...props} />);
  return props;
}

describe('AuthPage', () => {
  it('menampilkan hero, tab, tombol Google dan tamu', () => {
    pasang();
    expect(screen.getByText(/susun harimu bersama ai/i)).toBeTruthy();
    expect(screen.getByRole('tab', { name: /masuk/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /daftar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /masuk dengan google/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /lanjut tanpa akun/i })).toBeTruthy();
  });

  it('tab Daftar: nama 1 karakter ditolak, consent wajib', () => {
    const props = pasang();
    fireEvent.click(screen.getByRole('tab', { name: /daftar/i }));
    fireEvent.change(screen.getByLabelText(/nama tampilan/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@mail.com' } });
    fireEvent.change(screen.getByLabelText(/sandi/i), { target: { value: 'rahasia123' } });
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));
    // Tombol Daftar disabled sampai consent dicentang (klik di atas no-op:
    // browser maupun jsdom tidak menjalankan handler pada tombol disabled),
    // jadi submit dilakukan langsung untuk menguji validasi nama.
    fireEvent.submit(screen.getByRole('button', { name: /^daftar$/i }).closest('form'));
    expect(props.onDaftar).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^daftar$/i }).disabled).toBe(true);
  });

  it('tab Daftar valid + consent -> onDaftar dipanggil', () => {
    const props = pasang();
    fireEvent.click(screen.getByRole('tab', { name: /daftar/i }));
    fireEvent.change(screen.getByLabelText(/nama tampilan/i), { target: { value: 'Budi' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@mail.com' } });
    fireEvent.change(screen.getByLabelText(/sandi/i), { target: { value: 'rahasia123' } });
    fireEvent.click(screen.getByLabelText(/ai boleh membaca/i));
    fireEvent.click(screen.getByRole('button', { name: /^daftar$/i }));
    expect(props.onDaftar).toHaveBeenCalledWith({ nama: 'Budi', email: 'a@mail.com', sandi: 'rahasia123' });
  });

  it('tab Masuk: Google, tamu, dan galat server', () => {
    const props = pasang({ galat: 'Gagal: Invalid login' });
    fireEvent.click(screen.getByRole('button', { name: /masuk dengan google/i }));
    fireEvent.click(screen.getByRole('button', { name: /lanjut tanpa akun/i }));
    expect(props.onGoogle).toHaveBeenCalledTimes(1);
    expect(props.onTamu).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toMatch(/invalid login/i);
  });
});
