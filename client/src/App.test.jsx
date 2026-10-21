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
    // Tanpa tenggat: task hasil parse tidak boleh kena auto-hapus 1 dtk di App
    // (dulu bertanggal 2026-10-20 sehingga tes flaky begitu tanggal lewat).
    tasks: [{ title: 'Rapat', due_date: null, due_time: null, time_precision: 'UNSPECIFIED', urgency: 'NORMAL', priority: 'MEDIUM' }],
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

// Tanggal relatif waktu nyata: seminggu ke depan agar timer auto-hapus tugas
// lewat waktu tidak ikut jalan saat tes.
function tanggalMasaDepan(hari = 7) {
  const d = new Date();
  d.setDate(d.getDate() + hari);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Label hari yang diharapkan, dihitung terpisah dari komponen.
function labelHari(ymd) {
  const [y, bl, hr] = ymd.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(y, bl - 1, hr));
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

describe('tata letak masukan cepat', () => {
  it('tampil di bawah kartu aktivitas walau belum ada tugas', async () => {
    await masukLanding();
    const panel = document.querySelector('.panel-kiri');
    const aktivitas = panel?.querySelector('.kartu-aktivitas');
    const masukan = panel?.querySelector('section[aria-label="Masukan cepat"]');
    expect(aktivitas).toBeTruthy();
    expect(masukan).toBeTruthy();
    expect(aktivitas.compareDocumentPosition(masukan) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/tambahkan task nanti aku bantu saranin/i)).toBeTruthy();
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

describe('mode tugas (Asisten / Manual)', () => {
  it('tidak ada lagi badge mode di layar', async () => {
    await masukLanding();
    expect(screen.queryByText(/mode lokal/i)).toBeNull();
    expect(screen.queryByText(/mode ai/i)).toBeNull();
    expect(screen.queryByText(/pakai mode lokal/i)).toBeNull();
  });

  it('satu tombol switch berpindah Manual <-> Asisten', async () => {
    await masukLanding();
    expect(screen.queryByLabelText(/^judul$/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^manual$/i }));
    expect(screen.getByLabelText(/^judul$/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^asisten$/i }));
    expect(screen.queryByLabelText(/^judul$/i)).toBeNull();
  });

  it('mode manual: tanggal memunculkan hari, lalu menambah tugas', async () => {
    const api = await import('./lib/api.js');
    const tanggal = tanggalMasaDepan();
    await masukLanding();
    fireEvent.click(screen.getByRole('button', { name: /^manual$/i }));
    fireEvent.change(screen.getByLabelText(/^judul$/i), { target: { value: 'Belikan galon air' } });
    fireEvent.change(screen.getByLabelText(/^tanggal$/i), { target: { value: tanggal } });
    expect(screen.getByText(labelHari(tanggal))).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/^jam$/i), { target: { value: '09:00' } });
    fireEvent.click(screen.getByRole('button', { name: /^penting$/i }));
    fireEvent.click(screen.getByRole('button', { name: /tambah tugas/i }));
    await waitFor(() => expect(api.buatTask).toHaveBeenCalledTimes(1));
    expect(api.buatTask.mock.calls[0][0]).toMatchObject({
      title: 'Belikan galon air',
      due_date: tanggal,
      due_time: '09:00',
      urgency: 'URGENT',
    });
    await screen.findByText(/tugas tersimpan/i);
  });

  it('AI gagal -> tidak jatuh ke parser lokal, muncul pesan galat', async () => {
    const api = await import('./lib/api.js');
    api.mintaParse.mockRejectedValueOnce(new Error('api-500'));
    await masukLanding();
    fireEvent.click(screen.getByRole('button', { name: /susun jadi tugas/i }));
    await screen.findByText(/gagal menghubungi ai/i);
    expect(screen.queryByRole('button', { name: /konfirmasi/i })).toBeNull();
  });
});
