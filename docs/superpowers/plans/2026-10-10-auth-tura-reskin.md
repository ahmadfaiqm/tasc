# Auth Gate + Reskin TURA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah layar Auth TURA (email+sandi+Google+tamu) sebagai gerbang kondisional dan selaraskan sisa CSS ke tokens TURA tanpa router baru.

**Architecture:** `AuthGate.jsx` baru (form + error inline, tanpa import supabase langsung — semua aksi via props callback agar unit-testable). `App.jsx` me-render gate bila `supabase && !pengguna && !modeTamu` (tamu di `sessionStorage`); form inline lama menjadi status bar. CSS auth menempel pada tokens yang sudah ada di `styles.css`.

**Tech Stack:** React 18 + Vite 5, Supabase Auth (`signUp`, `signInWithPassword`, `signInWithOAuth`), Vitest 2 + Testing Library + jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-auth-tura-reskin-design.md`

## Global Constraints

- Tanpa dependensi baru (tanpa react-router, tanpa user-event — hanya `fireEvent` dari `@testing-library/react`).
- Perintah Windows di repo ini memakai `npm.cmd` (alasan: `npm.ps1` diblokir ExecutionPolicy).
- Semua teks UI Bahasa Indonesia; gaya tokens TURA (`--bg #16171b`, `--card #1b1c21`, `--ink #ecebe8`, font Syne).
- Mode tamu (localStorage + `sessionStorage taskman:tamu`) tetap dipertahankan; logika parser/API/timer tidak disentuh.

---

## File Structure

- Create `client/src/components/AuthGate.jsx` — form login (email, sandi, Masuk, Daftar, Google, tamu) + error inline. Props: `{ onMasuk(mode, {email, sandi}), onGoogle(), onTamu(), galat, sibuk }`. Tidak import supabase.
- Create `client/src/components/AuthGate.test.jsx` — unit test Vitest untuk komponen di atas (mock callback via `vi.fn()`).
- Modify `client/src/App.jsx:146-151` — tambah state `modeTamu` (baca `sessionStorage`), `galatAuth`, `sibukAuth`; hapus state `email`/`sandi` lama (pindah ke AuthGate).
- Modify `client/src/App.jsx:452-466` — ganti `masuk(modeAuth)` lama menjadi `masuk(mode, {email, sandi})` + `masukGoogle()` + `pilihTamu()`; `keluar()` juga hapus flag tamu.
- Modify `client/src/App.jsx:468-531` — render kondisional `<AuthGate>` + sederhanakan kartu akun menjadi status bar.
- Modify `client/src/styles.css` — tambah kelas `.auth-gate`, `.wordmark-kecil`, `.auth-kartu`, `.pemisah`, `.galat`, `button.tautan` (di akhir file, sebelum blok responsif).
- Modify `client/e2e/smoke.spec.js` — lewati gate via "lanjut sebagai tamu" + satu test baru visibilitas gate.
- Modify `design.md` — satu baris: "masuk lewat akun Claude" menjadi "masuk lewat akun email (Supabase) atau Google".

---

### Task 1: Komponen AuthGate + unit test (TDD)

**Files:**
- Create: `client/src/components/AuthGate.jsx`
- Test: `client/src/components/AuthGate.test.jsx`

**Interfaces:**
- Consumes: tidak ada (komponen daun).
- Produces: `AuthGate(props)` — props `{ onMasuk(mode: 'masuk'|'daftar', {email: string, sandi: string}), onGoogle(), onTamu(), galat: string, sibuk: boolean }`. Dipakai Task 2 oleh `App.jsx`.

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthGate from './AuthGate.jsx';

function pasang(override = {}) {
  const props = { onMasuk: vi.fn(), onGoogle: vi.fn(), onTamu: vi.fn(), galat: '', sibuk: false, ...override };
  render(<AuthGate {...props} />);
  return props;
}

describe('AuthGate', () => {
  it('menampilkan field email, sandi, tombol Masuk/Daftar/Google/tamu', () => {
    pasang();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.getByLabelText(/sandi/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^masuk$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /daftar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /masuk dengan google/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /lanjut sebagai tamu/i })).toBeTruthy();
  });

  it('submit kosong tidak memanggil onMasuk dan menampilkan peringatan', () => {
    const props = pasang();
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));
    expect(props.onMasuk).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('submit terisi memanggil onMasuk dengan email dan sandi', () => {
    const props = pasang();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'nama@email.com' } });
    fireEvent.change(screen.getByLabelText(/sandi/i), { target: { value: 'rahasia123' } });
    fireEvent.click(screen.getByRole('button', { name: /^masuk$/i }));
    expect(props.onMasuk).toHaveBeenCalledWith('masuk', { email: 'nama@email.com', sandi: 'rahasia123' });
  });

  it('tombol Google dan tamu memanggil callback masing-masing sekali', () => {
    const props = pasang();
    fireEvent.click(screen.getByRole('button', { name: /masuk dengan google/i }));
    fireEvent.click(screen.getByRole('button', { name: /lanjut sebagai tamu/i }));
    expect(props.onGoogle).toHaveBeenCalledTimes(1);
    expect(props.onTamu).toHaveBeenCalledTimes(1);
  });

  it('galat dari server tampil dan tombol nonaktif saat sibuk', () => {
    pasang({ galat: 'Gagal: Invalid login', sibuk: true });
    expect(screen.getByRole('alert').textContent).toMatch(/invalid login/i);
    expect(screen.getByRole('button', { name: /^masuk$/i }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: /masuk dengan google/i }).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd --prefix client run test -- --run src/components/AuthGate.test.jsx`
Expected: FAIL with "Failed to resolve import ./AuthGate.jsx" (file belum ada).

- [ ] **Step 3: Write minimal implementation**

```jsx
import { useState } from 'react';

export default function AuthGate({ onMasuk, onGoogle, onTamu, galat = '', sibuk = false }) {
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [petunjuk, setPetunjuk] = useState('');
  const pesan = petunjuk || galat;

  const kirim = (mode) => (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email.trim()) {
      setPetunjuk('Isi email dulu.');
      return;
    }
    setPetunjuk('');
    onMasuk(mode, { email: email.trim(), sandi });
  };

  return (
    <section aria-label="Masuk akun" className="bagian auth-gate">
      <p className="nav-nomor">00</p>
      <p className="wordmark wordmark-kecil" aria-hidden="true">
        TASKA
      </p>
      <form className="kartu auth-kartu" onSubmit={kirim('masuk')}>
        <h2>Masuk</h2>
        {pesan ? (
          <p role="alert" className="galat">
            {pesan}
          </p>
        ) : null}
        <label htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          autoComplete="email"
        />
        <label htmlFor="auth-sandi">Sandi</label>
        <input
          id="auth-sandi"
          type="password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          autoComplete="current-password"
        />
        <div className="baris">
          <button type="submit" className="primer" disabled={sibuk}>
            Masuk
          </button>
          <button type="button" onClick={kirim('daftar')} disabled={sibuk}>
            Daftar
          </button>
        </div>
        <p className="pemisah" aria-hidden="true">
          atau
        </p>
        <button type="button" onClick={onGoogle} disabled={sibuk}>
          Masuk dengan Google
        </button>
        <button type="button" className="tautan" onClick={onTamu}>
          lanjut sebagai tamu
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd --prefix client run test -- --run src/components/AuthGate.test.jsx`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AuthGate.jsx client/src/components/AuthGate.test.jsx
git commit -m "feat(client): AuthGate TURA + unit test"
```

---

### Task 2: Gate wiring di App.jsx (state, OAuth, status bar)

**Files:**
- Modify: `client/src/App.jsx:1-20` (tambah import AuthGate)
- Modify: `client/src/App.jsx:146-151` (state baru, hapus email/sandi lama)
- Modify: `client/src/App.jsx:452-466` (masuk baru + Google + tamu)
- Modify: `client/src/App.jsx:468-531` (render kondisional + status bar)

**Interfaces:**
- Consumes: `AuthGate` dari Task 1 (props `onMasuk/onGoogle/onTamu/galat/sibuk`).
- Produces: tidak ada ekspor baru; perilaku: pengunjung tanpa sesi melihat gate, tamu/app sesudah login seperti semula.

- [ ] **Step 1: Tambah import dan state, hapus state form lama**

Ganti baris import komponen (setelah `import Toast ...`):

```jsx
import AuthGate from './components/AuthGate.jsx';
```

Ganti blok state:

```jsx
const [pengguna, setPengguna] = useState(null);
const [email, setEmail] = useState('');
const [sandi, setSandi] = useState('');
```

menjadi:

```jsx
const [pengguna, setPengguna] = useState(null);
const [modeTamu, setModeTamu] = useState(() => {
  try {
    return sessionStorage.getItem('taskman:tamu') === '1';
  } catch {
    return false;
  }
});
const [galatAuth, setGalatAuth] = useState('');
const [sibukAuth, setSibukAuth] = useState(false);
```

- [ ] **Step 2: Ganti fungsi masuk/keluar**

Ganti seluruh fungsi `masuk` dan `keluar` lama:

```jsx
const masuk = async (mode, { email, sandi }) => {
  if (!supabase) {
    tampilkanToast('Supabase belum dikonfigurasi — mode tamu (localStorage)');
    return;
  }
  setSibukAuth(true);
  try {
    const fn = mode === 'daftar' ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { error } = await fn({ email, password: sandi });
    if (error) {
      setGalatAuth(`Gagal: ${error.message}`);
      return;
    }
    setGalatAuth('');
    tampilkanToast(mode === 'daftar' ? 'Cek email untuk verifikasi' : 'Masuk berhasil');
  } finally {
    setSibukAuth(false);
  }
};
const masukGoogle = async () => {
  if (!supabase) {
    tampilkanToast('Supabase belum dikonfigurasi — mode tamu (localStorage)');
    return;
  }
  setSibukAuth(true);
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setGalatAuth(`Gagal: ${error.message}`);
  } finally {
    setSibukAuth(false);
  }
};
const pilihTamu = () => {
  try {
    sessionStorage.setItem('taskman:tamu', '1');
  } catch { /* abaikan */ }
  setModeTamu(true);
};
const keluar = async () => {
  if (supabase) await supabase.auth.signOut();
  simpanToken('');
  try {
    sessionStorage.removeItem('taskman:tamu');
  } catch { /* abaikan */ }
  setPengguna(null);
  setModeTamu(false);
  setGalatAuth('');
  sudahMuat.current = false;
};
```

- [ ] **Step 3: Render kondisional + status bar**

Di `return`, bungkus nav + section hero/folder/kerja yang sudah ada. Tepat setelah `<main className="wadah">`, sisipkan gate dan sembunyikan sisanya bila gate aktif. Cara terkecil tanpa merombak DOM: ubah baris pembuka main menjadi:

```jsx
return (
  <main className="wadah">
    {supabase && !pengguna && !modeTamu ? (
      <AuthGate onMasuk={masuk} onGoogle={masukGoogle} onTamu={pilihTamu} galat={galatAuth} sibuk={sibukAuth} />
    ) : (
      <>
        ...SEMUA ISI MAIN YANG SUDAH ADA (nav, tepi, section atas/folder/kerja)...
      </>
    )}
    <Toast ... />
  </main>
);
```

Lalu di dalam section kerja, ganti seluruh `<section aria-label="Akun" className="kartu akun">...</section>` menjadi status bar:

```jsx
<section aria-label="Akun" className="kartu akun">
  {pengguna ? (
    <div className="baris">
      <span>Masuk sebagai {pengguna.email}</span>
      <button type="button" onClick={keluar}>
        Keluar
      </button>
    </div>
  ) : (
    <div className="baris">
      <span className="privasi">Mode tamu — tugas tersimpan di browser</span>
      <button type="button" onClick={keluar}>
        Ganti akun
      </button>
    </div>
  )}
</section>
```

(Catatan: `keluar` untuk tamu hanya me-reset flag sehingga gate tampil lagi — tombol berlabel "Ganti akun".)

- [ ] **Step 4: Run full client unit suite (pastikan tidak ada regresi)**

Run: `npm.cmd --prefix client run test -- --run`
Expected: PASS semua (termasuk `AuthGate.test.jsx` + suite parser/eval yang sudah ada).

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx
git commit -m "feat(client): gate AuthGate + OAuth Google + status bar akun"
```

---

### Task 3: Kelas CSS layar auth (TURA)

**Files:**
- Modify: `client/src/styles.css` (tambah di akhir, sebelum `/* responsif */`)

**Interfaces:**
- Consumes: tokens `:root` yang sudah ada. Produces: kelas dipakai Task 1–2.

- [ ] **Step 1: Tambah CSS auth**

```css
/* layar masuk */
.auth-gate { text-align: center; align-items: center; }
.wordmark-kecil { font-size: clamp(40px, 8vw, 96px); }
.auth-kartu { width: min(26rem, 92vw); text-align: left; display: grid; gap: 0.5rem; }
.auth-kartu h2 { font-size: 22px; margin: 0; }
.pemisah { color: var(--mute); text-align: center; margin: 0.25rem 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; }
.galat { color: var(--magenta); font-size: 0.9rem; margin: 0; }
button.tautan { background: none; border: none; box-shadow: none; color: var(--mute); text-transform: none; letter-spacing: normal; padding: 0.2rem 0; }
button.tautan:hover { background: none; color: var(--ink); transform: none; }
@media (max-width: 560px) { .auth-kartu { width: 94vw; } }
```

- [ ] **Step 2: Verifikasi build lolos**

Run: `npm.cmd --prefix client run build`
Expected: `vite build` sukses, output `dist/` terisi (abaikan warning chunk bila ada).

- [ ] **Step 3: Commit**

```bash
git add client/src/styles.css
git commit -m "style(client): kelas layar auth TURA"
```

---

### Task 4: Smoke Playwright lewat gate + test visibilitas gate

**Files:**
- Modify: `client/e2e/smoke.spec.js`

**Interfaces:**
- Consumes: tombol "lanjut sebagai tamu" dari Task 1. Produces: suite e2e hijau dengan gate aktif.

- [ ] **Step 1: Perbarui smoke spec**

Tambahkan test gate di atas test yang sudah ada, dan selipkan lewati-gate di awal test lama:

```js
test('pengunjung tanpa sesi melihat layar masuk', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/masuk akun/i)).toBeVisible();
  await expect(page.getByLabel(/email/i).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /masuk dengan google/i })).toBeVisible();
});
```

Di awal test lama (`tulis -> pratinjau ...`), tepat setelah `await page.goto('/');`, tambahkan:

```js
await page
  .getByRole('button', { name: /lanjut sebagai tamu/i })
  .click({ timeout: 5000 })
  .catch(() => {});
```

(Sengaja toleran: bila env Supabase tidak tersedia, gate tidak tampil dan alur tamu langsung jalan.)

- [ ] **Step 2: Run Playwright**

Run (workdir `client/`): `npx playwright test`
Expected: PASS semua spec di `e2e/` (webServer dev otomatis via `playwright.config.js`; butuh `client/.env` Supabase terisi agar test gate berjalan — bila gate tidak tampil, test gate akan FAIL dan itu sinyal env belum terisi, bukan salah kode).

- [ ] **Step 3: Commit**

```bash
git add client/e2e/smoke.spec.js
git commit -m "test(e2e): smoke lewat gate tamu + visibilitas layar masuk"
```

---

### Task 5: Koreksi design.md + kunci dashboard + verifikasi akhir

**Files:**
- Modify: `design.md` (satu baris bag. 5)
- Verify: Supabase dashboard + Vercel prod (manual, di luar kode)

**Interfaces:** menutup semua requirement spec.

- [ ] **Step 1: Koreksi satu baris design.md**

Ganti:

```
Pengguna masuk lewat akun Claude.
```

menjadi:

```
Pengguna masuk lewat akun email (Supabase email+sandi) atau Google OAuth; tanpa akun tersedia mode tamu (localStorage).
```

- [ ] **Step 2: Checklist dashboard Supabase (manual, wajib sebelum klaim selesai)**

1. Supabase → Authentication → Providers → aktifkan **Google** (isi Client ID + Secret dari Google Cloud Console).
2. Supabase → Authentication → URL Configuration → pastikan redirect terdaftar: `https://tasc-phi.vercel.app` dan `http://localhost:5173` (tambah `/**` bila diminta format wildcard dashboard).
3. Login manual di prod: email+sandi berhasil, Google berhasil kembali ke origin, tamu tetap bisa pakai app.

- [ ] **Step 3: Verifikasi akhir + commit + push**

Run: `npm.cmd run test:all`
Expected: PASS (client + api).

```bash
git add design.md
git commit -m "docs: koreksi login design.md (Supabase email+Google)"
git push origin main
```

Lalu cek live `https://tasc-phi.vercel.app/` (incognito): gate tampil → tamu masuk → `/api/health` tetap `{"ok":true}`.
