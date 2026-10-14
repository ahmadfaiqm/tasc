import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AuthPage from './AuthPage.jsx';

afterEach(cleanup);

function pasang(override = {}) {
  const props = { onMasuk: vi.fn(), onDaftar: vi.fn(), onGoogle: vi.fn(), galat: '', sibuk: false, namaAwal: '', ...override };
  render(<AuthPage {...props} />);
  return props;
}

describe('AuthPage', () => {
  it('menampilkan hero, tab, dan tombol Google tanpa tamu', () => {
    pasang();
    expect(screen.getByText(/susun harimu bersama ai/i)).toBeTruthy();
    expect(screen.getByRole('tab', { name: /masuk/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /daftar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /masuk dengan google/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /lanjut tanpa akun/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /mulai/i })).toBeNull();
    expect(screen.queryByText(/selesai tepat waktu/i)).toBeNull();
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

  it('Enter di email mensubmit login', () => {
    const props = pasang();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@mail.com' } });
    fireEvent.submit(screen.getByLabelText(/email/i).closest('form'));
    expect(props.onMasuk).toHaveBeenCalledWith({ email: 'a@mail.com', sandi: '' });
  });

  it('tab Masuk: Google dan galat server', () => {
    const props = pasang({ galat: 'Gagal: Invalid login' });
    fireEvent.click(screen.getByRole('button', { name: /masuk dengan google/i }));
    expect(props.onGoogle).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert').textContent).toMatch(/invalid login/i);
  });
});
