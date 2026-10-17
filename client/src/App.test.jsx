import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import App from './App.jsx';

vi.mock('./lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: { user: { email: 'a@mail.com', user_metadata: { avatar_url: 'https://x/a.png' } } },
        },
      }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({}),
      signUp: async () => ({}),
      signInWithOAuth: async () => ({}),
      signOut: async () => ({}),
    },
  },
}));

vi.mock('./lib/api.js', () => ({
  mintaParse: vi.fn(async () => ({
    tasks: [{ title: 'Rapat', due_date: '2026-10-20', due_time: null, time_precision: 'UNSPECIFIED', urgency: 'NORMAL', priority: 'MEDIUM' }],
    sumber: 'ai',
  })),
  muatTasks: vi.fn(async () => ({ tasks: [] })),
  buatTask: vi.fn(async (p) => ({ id: 't1', status: 'PENDING', ...p })),
  ubahTask: vi.fn(async (id, p) => ({ id, status: 'PENDING', ...p })),
  hapusTask: vi.fn(async () => ({})),
  selesaikanTask: vi.fn(async (id) => ({ id, title: 'Rapat', due_date: '2026-10-20', status: 'COMPLETED' })),
  bukaUlangTask: vi.fn(async (id) => ({ id, status: 'PENDING' })),
  ambilToken: vi.fn(async () => 'tok'),
  simpanToken: vi.fn(),
  muatProfil: vi.fn(async () => ({ nama: 'Budi', aiConsent: true })),
  simpanProfil: vi.fn(async () => ({})),
  riwayatBulan: vi.fn(async () => ({ total: 0, completed: 0, overdue: 0, cancelled: 0, completion_rate: 0, urgent: 0, byDay: {} })),
  tanyaAsisten: vi.fn(async () => ({ jawaban: 'ok' })),
}));

if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

async function masukLanding() {
  render(<App />);
  await screen.findByText(/halo/i);
  fireEvent.change(screen.getByLabelText(/tulis tugas baru/i, { selector: 'textarea' }), { target: { value: 'Rapat besok' } });
}

describe('App core flow', () => {
  it('klik ganda Susun hanya mem-parse sekali', async () => {
    const api = await import('./lib/api.js');
    await masukLanding();
    const tombol = screen.getByRole('button', { name: /susun jadi tugas/i });
    act(() => {
      fireEvent.click(tombol);
      fireEvent.click(tombol);
    });
    expect(api.mintaParse).toHaveBeenCalledTimes(1);
  });

  it('susun -> konfirmasi -> centang', async () => {
    const api = await import('./lib/api.js');
    await masukLanding();
    fireEvent.click(screen.getByRole('button', { name: /susun jadi tugas/i }));
    await screen.findByRole('button', { name: /konfirmasi/i });
    fireEvent.click(screen.getByRole('button', { name: /konfirmasi/i }));
    await screen.findByText(/tugas tersimpan/i);
    expect(api.buatTask).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('checkbox', { name: /tandai selesai: rapat/i }));
    await waitFor(() => expect(api.selesaikanTask).toHaveBeenCalledTimes(1));
  });
});

describe('profil', () => {
  it('login tanpa baris profil -> dibuat otomatis dengan nama "human"', async () => {
    const api = await import('./lib/api.js');
    api.muatProfil.mockRejectedValueOnce(new Error('api-404'));
    render(<App />);
    await screen.findByText(/halo, human/i);
    expect(api.simpanProfil).toHaveBeenCalledWith({ nama: 'human', aiConsent: false, email: 'a@mail.com' });
  });

  it('gagal muat profil selain 404 -> tidak membuat baris', async () => {
    const api = await import('./lib/api.js');
    api.muatProfil.mockRejectedValueOnce(new Error('api-500'));
    render(<App />);
    await screen.findByText(/halo, teman/i);
    expect(api.simpanProfil).not.toHaveBeenCalled();
  });

  it('ubah nama -> tersimpan dan sapaan berubah', async () => {
    const api = await import('./lib/api.js');
    api.simpanProfil.mockResolvedValueOnce({ nama: 'Ani' });
    await masukLanding();
    fireEvent.click(screen.getByRole('button', { name: /menu profil/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    fireEvent.change(screen.getByLabelText(/^nama$/i), { target: { value: 'Ani' } });
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }));
    await waitFor(() => expect(api.simpanProfil).toHaveBeenCalledWith({ nama: 'Ani' }));
    await screen.findByText(/halo, ani/i);
  });

  it('nama < 2 karakter ditolak, tidak dikirim ke server', async () => {
    const api = await import('./lib/api.js');
    await masukLanding();
    fireEvent.click(screen.getByRole('button', { name: /menu profil/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /pengaturan profil/i }));
    fireEvent.change(screen.getByLabelText(/^nama$/i), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /^simpan$/i }));
    await screen.findByText(/2–40|2-40/);
    expect(api.simpanProfil).not.toHaveBeenCalled();
  });

  it('foto akun Google dari sesi tampil di avatar', async () => {
    await masukLanding();
    const img = screen.getByRole('button', { name: /menu profil/i }).querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://x/a.png');
  });
});
