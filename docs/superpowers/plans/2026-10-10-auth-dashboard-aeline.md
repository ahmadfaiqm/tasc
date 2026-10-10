# Auth + Dashboard Aeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman masuk/daftar Aeline + dashboard tab + tema terang/gelap + profil nama di DB, evolusi di tempat tanpa router.

**Architecture:** Tema dulu (CSS rewrite + font), lalu backend profil, lalu AuthPage, lalu Dashboard+Ringkasan yang me-reuse komponen lama, terakhir e2e ditulis ulang. Tab via state React.

**Tech Stack:** React 18 + Vite 5, Supabase Auth, Prisma 5 + Postgres, Zod 4, Vitest 2 + Testing Library (hanya fireEvent), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-auth-dashboard-aeline-design.md`

## Global Constraints

- Tanpa dependensi baru (tanpa react-router, tanpa user-event).
- Perintah Windows memakai `npm.cmd` (`npm.ps1` diblokir ExecutionPolicy).
- Semua teks UI Bahasa Indonesia.
- Urgency kanonis: `URGENT`/`NORMAL`/`LOW`.
- Mode tamu (localStorage + `sessionStorage taskman:tamu`) dipertahankan; logika parser/urgensi/API task/AI tidak diubah.
- Jangan sentuh `design.md`. Jangan push (hanya commit).

---

## File Structure

- Modify `client/index.html` — tambah font DM Mono.
- Rewrite `client/src/styles.css` — tokens Aeline + kelas baru; bawa selector komponen lama.
- Modify `prisma/schema.prisma` — `User` += `aiConsent`.
- Modify `supabase/schema.sql` — tabel `users` += `ai_consent`.
- Create `api/routes/profile.js` + mount di `api/app.js` + `api/routes/profile.test.js`.
- Create `client/src/components/AuthPage.jsx` + test.
- Create `client/src/lib/ringkasan.js` + test + `client/src/components/Ringkasan.jsx` + `Dashboard.jsx`.
- Modify `client/src/App.jsx` + `client/src/lib/api.js`.
- Rewrite `client/e2e/smoke.spec.js`.

---

### Task 1: Tema Aeline (font + rewrite styles.css)

**Files:**
- Modify: `client/index.html:11-14`
- Rewrite: `client/src/styles.css`

**Interfaces:**
- Consumes: tidak ada. Produces: kelas untuk Task 3-4 (`auth-page auth-hero auth-logo auth-card tab-segmented kartu-contoh dash-header nav-pil bento-grid bento bento-lime bento-hitam bento-abu bento-biru panggung-abu mikro galat pil-hitam`). Selector lama dipertahankan: `tugas daftar-tugas label-* balon chat-daftar saran-cepat toast komidi kartu-folder`.

- [ ] **Step 1: Tambah font DM Mono di index.html**

Ganti blok link font menjadi:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600&family=DM+Mono:wght@400&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 2: Tulis ulang styles.css (bagian A: tokens + halaman masuk)**

Tulis ulang penuh file. Bagian A verbatim:

```css
/* TASKA — tema Aeline: terang+gelap, Syne + DM Mono. Lihat design.md. */
:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --sf: #f3f3f1;
  --card: #ffffff;
  --ink: #101114;
  --mute: #6c6f76;
  --line: #e6e6e2;
  --lime: #d4f55c;
  --blue: #2c78e6;
  --font-judul: 'Syne', 'Century Gothic', 'Avenir Next', system-ui, sans-serif;
  --font-mono: 'DM Mono', ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0e0f12;
    --sf: #1b1c21;
    --card: #17181c;
    --ink: #f3f3f0;
    --mute: #9b9da5;
    --line: #2a2c33;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; font-family: var(--font-judul); font-size: 14px; line-height: 1.6;
  color: var(--ink); background: var(--bg); min-height: 100svh;
  padding-bottom: env(safe-area-inset-bottom);
}
h1 { font-weight: 500; letter-spacing: -0.03em; }
h2 { font-size: clamp(28px, 4.4vw, 48px); font-weight: 500; letter-spacing: -0.025em; margin: 0 0 1rem; }
h3 { font-size: 20px; font-weight: 600; margin: 0 0 0.75rem; }
button, .mikro, .nav-pil button, .tab-segmented button { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }
.mikro { color: var(--mute); }
.mikro::before { content: "• "; }
textarea:focus-visible, input:focus-visible, button:focus-visible, a:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
textarea, input[type="email"], input[type="password"], input[type="text"] {
  width: 100%; padding: 0.7rem 1rem; border-radius: 16px;
  border: 1px solid var(--line); background: var(--sf); color: var(--ink);
  font-family: var(--font-judul); font-size: 14px;
}
button { border: none; cursor: pointer; border-radius: 999px; padding: 0.7rem 1.4rem; transition: transform 0.15s ease; }
button:hover:not(:disabled) { transform: translateY(-1px); }
button:disabled { opacity: 0.5; cursor: default; }
.pil-hitam { background: #101114; color: #f3f3f0; }
.galat { color: #c2255c; font-size: 0.9rem; margin: 0; }
@media (prefers-color-scheme: dark) { .galat { color: #f783ac; } }
.auth-page { padding: 10px; }
.auth-hero {
  min-height: calc(100svh - 20px); border-radius: 28px;
  background: linear-gradient(160deg, #2a75e6 0%, #4f9bf2 55%, #a6d2ff 100%);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; text-align: center; color: #fff;
}
.auth-hero::before, .auth-hero::after {
  content: ""; position: absolute; border-radius: 50%; background: rgba(255, 255, 255, 0.35);
  filter: blur(60px);
}
.auth-hero::before { width: 34rem; height: 14rem; top: 6%; left: -6rem; }
.auth-hero::after { width: 28rem; height: 12rem; bottom: 10%; right: -5rem; }
.auth-logo { position: absolute; top: 1.2rem; left: 1.4rem; display: flex; gap: 0.5rem; align-items: center; font-weight: 600; z-index: 1; }
.auth-logo .centang { background: var(--lime); color: #101114; border-radius: 10px; padding: 0.15rem 0.45rem; }
.auth-hero h1 { font-size: clamp(36px, 6.2vw, 76px); margin: 0; z-index: 1; }
.auth-hero .sub { color: #fff; opacity: 0.9; max-width: 30rem; z-index: 1; }
.auth-card {
  background: #fff; color: #101114; border-radius: 26px; padding: 1.4rem;
  width: min(26rem, 92vw); z-index: 1; text-align: left;
  box-shadow: 0 30px 70px rgba(8, 40, 110, 0.3);
}
.tab-segmented { display: grid; grid-template-columns: 1fr 1fr; background: var(--sf); border-radius: 999px; padding: 4px; margin-bottom: 1rem; }
.tab-segmented button { background: transparent; color: var(--mute); border-radius: 999px; }
.tab-segmented button[aria-selected="true"] { background: #101114; color: #f3f3f0; }
.auth-card .tombol-utama { background: var(--lime); color: #101114; width: 100%; font-weight: 700; }
.kartu-contoh { display: flex; gap: 0.75rem; margin-top: 1.5rem; z-index: 1; perspective: 900px; }
.kartu-contoh .contoh {
  background: rgba(255, 255, 255, 0.92); color: #101114; border-radius: 16px;
  padding: 0.8rem 1rem; font-size: 12px; transform: rotateX(12deg); min-width: 9rem;
}
@media (max-width: 820px) { .kartu-contoh { display: none; } }
```

- [ ] **Step 3: Tambah bagian B (dashboard + komponen, akhir file)**

```css
.dash-header {
  position: sticky; top: 0; z-index: 20; display: flex; gap: 1rem; align-items: center;
  background: var(--bg); padding: 0.8rem max(1rem, env(safe-area-inset-right)) 0.8rem max(1rem, env(safe-area-inset-left));
  border-bottom: 1px solid var(--line);
}
.nav-pil { display: flex; gap: 0.4rem; background: var(--sf); border-radius: 999px; padding: 4px; }
.nav-pil button { background: transparent; color: var(--mute); border-radius: 999px; }
.nav-pil button[aria-selected="true"] { background: #101114; color: #f3f3f0; }
.dash-nama { margin-left: auto; color: var(--mute); font-size: 13px; }
.bento-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(4, 1fr); }
.bento { border-radius: 22px; padding: 1.1rem; box-shadow: 0 0 0 1px var(--line), 0 14px 34px rgba(16, 17, 20, 0.05); }
.bento .angka { font-size: 30px; font-weight: 600; }
.bento-lime { background: var(--lime); color: #101114; }
.bento-hitam { background: #101114; color: var(--lime); }
.bento-abu { background: var(--sf); color: var(--ink); }
.bento-biru { background: linear-gradient(150deg, #2c78e6, #7db4f7); color: #fff; }
.panggung-abu { background: var(--sf); border-radius: 28px; padding: 1.2rem; }
.kolom-dash { display: grid; gap: 1rem; grid-template-columns: 1fr; }
.asisten-sticky { position: static; }
@media (min-width: 901px) {
  .kolom-dash { grid-template-columns: 1.2fr 1fr; align-items: start; }
  .asisten-sticky { position: sticky; top: 4.5rem; }
}
@media (max-width: 900px) {
  .nav-pil { display: none; }
  .bento-grid { grid-template-columns: 1fr 1fr; }
}
.kartu { background: var(--card); border-radius: 26px; padding: 1rem; box-shadow: 0 0 0 1px var(--line), 0 14px 34px rgba(16, 17, 20, 0.05); }
.baris { display: flex; gap: 0.5rem; align-items: center; margin-top: 0.5rem; flex-wrap: wrap; }
.daftar-tugas { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.5rem; }
.tugas { display: grid; grid-template-columns: auto 1fr auto auto auto; gap: 0.5rem; align-items: center; background: var(--sf); padding: 0.5rem 0.7rem; border-radius: 16px; }
.tugas input[type="checkbox"] { width: 1.2rem; height: 1.2rem; accent-color: var(--lime); }
.tugas-nama { overflow-wrap: anywhere; }
.tugas-waktu { color: var(--mute); font-size: 0.9rem; }
.tugas.selesai .tugas-nama { text-decoration: line-through; opacity: 0.6; }
.tugas.segera .tugas-waktu { font-weight: 700; color: var(--ink); }
.label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.25rem 0.7rem; border-radius: 999px; white-space: nowrap; }
.label-mendesak, .label-urgent { background: #101114; color: var(--lime); font-weight: 700; }
.label-sedang, .label-normal { background: var(--lime); color: #101114; }
.label-santai, .label-low { background: var(--sf); color: var(--mute); box-shadow: inset 0 0 0 1px var(--line); }
.chat-daftar { list-style: none; margin: 0 0 0.75rem; padding: 0; display: grid; gap: 0.5rem; max-height: 300px; overflow-y: auto; }
.balon { max-width: 85%; padding: 0.5rem 0.9rem; border-radius: 16px; white-space: pre-wrap; overflow-wrap: anywhere; }
.balon.user { justify-self: end; background: #101114; color: #f3f3f0; }
.balon.ai { justify-self: start; background: var(--sf); color: var(--ink); }
.saran-cepat { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
.saran-cepat button { border-radius: 999px; background: var(--sf); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line); }
.toast {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: 1.5rem; z-index: 30;
  background: #101114; color: #f3f3f0; padding: 0.7rem 1.2rem; border-radius: 999px;
  display: flex; gap: 0.7rem; align-items: center; max-width: 90vw;
  margin-bottom: env(safe-area-inset-bottom);
}
.komidi { display: grid; grid-template-columns: 1fr; gap: 0.75rem; align-items: stretch; }
@media (min-width: 821px) { .komidi { grid-template-columns: 1fr 1.25fr 1fr; } }
.kartu-folder { position: relative; text-align: left; padding: 1rem; border-radius: 22px; background: var(--card); color: var(--ink); border: 1px solid var(--line); display: grid; gap: 0.5rem; cursor: pointer; font: inherit; }
.kartu-folder.samping { filter: blur(1.5px) brightness(0.85); transform: scale(0.94); opacity: 0.7; }
.batang { display: grid; gap: 4px; }
.batang .lajur { height: 8px; border-radius: 3px; background: var(--sf); overflow: hidden; }
.batang .isi { height: 100%; background-image: radial-gradient(rgba(0, 0, 0, 0.35) 1px, transparent 1px); background-size: 5px 5px; }
.grup-bulan { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mute); margin: 1.2rem 0 0.4rem; }
.grup-hari { display: flex; justify-content: space-between; align-items: baseline; margin: 0.8rem 0 0.4rem; font-weight: 600; }
@media (max-width: 560px) {
  .balon { max-width: 94%; }
  .tugas { grid-template-columns: auto 1fr auto; }
  .tugas .label { grid-row: 2; }
  .dash-nama { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

- [ ] **Step 4: Verifikasi build lolos**

Run: `npm.cmd --prefix client run build`
Expected: `vite build` sukses, `dist/` terisi.

- [ ] **Step 5: Commit**

```bash
git add client/index.html client/src/styles.css
git commit -m "style(client): tema Aeline terang+gelap + DM Mono"
```

---

### Task 2: Profil backend (skema + GET/PATCH /api/profile)

**Files:**
- Modify: `prisma/schema.prisma:71-87` (model User)
- Modify: `supabase/schema.sql:44-53` (tabel users)
- Create: `api/routes/profile.js`
- Modify: `api/app.js:1-15` (mount router)
- Test: `api/routes/profile.test.js`

**Interfaces:**
- Consumes: `wajibAuth` (`api/lib/auth.js`), `prisma` (`api/lib/prisma.js`), pola upsert `notifications.js:40-43`.
- Produces: `GET /api/profile -> {id, email, nama, aiConsent, timezone}` (404 bila belum ada); `PATCH /api/profile {nama, aiConsent, email?} -> profil` (400 nama invalid/email wajib untuk baru). Dipakai Task 4 via `muatProfil/simpanProfil`.

- [ ] **Step 1: Tambah kolom di kedua skema**

Di `prisma/schema.prisma`, dalam `model User` setelah `timezone`, tambah:

```prisma
aiConsent    Boolean  @default(false) @map("ai_consent")
```

Di `supabase/schema.sql`, dalam `create table users`, setelah `timezone`, tambah:

```sql
ai_consent boolean not null default false,
```

- [ ] **Step 2: Write the failing test**

```js
// api/routes/profile.test.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import request from 'supertest';
import app from '../app.js';
import prisma from '../lib/prisma.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SUPABASE_JWT_SECRET;
});

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buatToken(sub) {
  const h = b64url({ alg: 'HS256', typ: 'JWT' });
  const p = b64url({ sub });
  return `${h}.${p}.c2lnbmF0dXJlLWFjYWstZml4dG5t`;
}

describe('profile', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/profile');
    expect(r.status).toBe(401);
  });
  it('GET profil ada -> 200 serial', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 'user-a', email: 'a@mail.com', name: 'Budi', aiConsent: true, timezone: 'Asia/Jakarta' });
    const r = await request(app).get('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`);
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ id: 'user-a', email: 'a@mail.com', nama: 'Budi', aiConsent: true, timezone: 'Asia/Jakarta' });
  });
  it('GET profil belum ada -> 404', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const r = await request(app).get('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`);
    expect(r.status).toBe(404);
  });
  it('PATCH nama 1 karakter -> 400', async () => {
    const r = await request(app).patch('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`).send({ nama: 'A', aiConsent: true });
    expect(r.status).toBe(400);
  });
  it('PATCH profil baru tanpa email -> 400', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const r = await request(app).patch('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`).send({ nama: 'Budi', aiConsent: true });
    expect(r.status).toBe(400);
  });
  it('PATCH valid -> upsert milik sendiri -> 200', async () => {
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
    const upsert = vi.spyOn(prisma.user, 'upsert').mockResolvedValue({ id: 'user-a', email: 'a@mail.com', name: 'Budi', aiConsent: true, timezone: 'Asia/Jakarta' });
    const r = await request(app).patch('/api/profile').set('Authorization', `Bearer ${buatToken('user-a')}`).send({ nama: 'Budi', aiConsent: true, email: 'a@mail.com' });
    expect(r.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-a' } }));
    expect(r.body.nama).toBe('Budi');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm.cmd --prefix api run test -- --run routes/profile.test.js`
Expected: FAIL (Cannot find module `../routes/profile.js` via app.js mount — atau 404 karena route belum ada).

- [ ] **Step 4: Write minimal implementation**

```js
// api/routes/profile.js — profil nama + persetujuan AI milik sendiri.
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { wajibAuth } from '../lib/auth.js';

const r = Router();
r.use(wajibAuth);

const skemaPatch = z.object({
  nama: z.string().trim().min(2, 'nama minimal 2 karakter').max(40, 'nama maksimal 40 karakter'),
  aiConsent: z.boolean(),
  email: z.string().trim().email('email tidak valid').optional(),
});

function serial(profil) {
  return { id: profil.id, email: profil.email, nama: profil.name, aiConsent: profil.aiConsent, timezone: profil.timezone };
}

r.get('/', async (req, res) => {
  try {
    const profil = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!profil) return res.status(404).json({ error: 'profil belum ada' });
    return res.json(serial(profil));
  } catch {
    return res.status(500).json({ error: 'gagal memuat profil' });
  }
});

r.patch('/', async (req, res) => {
  const cek = skemaPatch.safeParse(req.body ?? {});
  if (!cek.success) return res.status(400).json({ error: cek.error.issues[0]?.message ?? 'input tidak valid' });
  const { nama, aiConsent, email } = cek.data;
  try {
    const ada = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ada && !email) return res.status(400).json({ error: 'email wajib untuk profil baru' });
    const profil = await prisma.user.upsert({
      where: { id: req.userId },
      update: { name: nama, aiConsent },
      create: { id: req.userId, email, name: nama, aiConsent },
    });
    return res.json(serial(profil));
  } catch {
    return res.status(500).json({ error: 'gagal menyimpan profil' });
  }
});

export default r;
```

Mount di `api/app.js` (tambah import + baris, pola sama seperti history):

```js
import profilRouter from './routes/profile.js';
app.use('/api/profile', profilRouter);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd --prefix api run test -- --run routes/profile.test.js`
Expected: PASS (6/6).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma supabase/schema.sql api/routes/profile.js api/routes/profile.test.js api/app.js
git commit -m "feat(api): profil nama+consent + GET/PATCH /api/profile"
```

---

### Task 3: AuthPage (hero biru + tab Masuk/Daftar)

**Files:**
- Create: `client/src/components/AuthPage.jsx`
- Test: `client/src/components/AuthPage.test.jsx`

**Interfaces:**
- Consumes: kelas CSS Task 1. Produces: `AuthPage({ onMasuk({email, sandi}), onDaftar({nama, email, sandi}), onGoogle(), onTamu(), galat, sibuk, namaAwal })`. Dipakai Task 4 oleh `App.jsx`.

- [ ] **Step 1: Write the failing test**

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthPage from './AuthPage.jsx';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd --prefix client run test -- --run src/components/AuthPage.test.jsx`
Expected: FAIL with "Failed to resolve import ./AuthPage.jsx".

- [ ] **Step 3: Write minimal implementation**

```jsx
import { useState } from 'react';

const CONTOH = ['Tugas kuliah', 'Mendesak', 'AI membaca', 'Rekap'];

export default function AuthPage({ onMasuk, onDaftar, onGoogle, onTamu, galat = '', sibuk = false, namaAwal = '' }) {
  const [tab, setTab] = useState('masuk');
  const [nama, setNama] = useState(namaAwal);
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [setuju, setSetuju] = useState(false);
  const [petunjuk, setPetunjuk] = useState('');
  const pesan = petunjuk || galat;
  const namaOk = nama.trim().length >= 2 && nama.trim().length <= 40;

  const kirimMasuk = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!email.trim()) {
      setPetunjuk('Isi email dulu.');
      return;
    }
    setPetunjuk('');
    onMasuk({ email: email.trim(), sandi });
  };

  const kirimDaftar = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!namaOk) {
      setPetunjuk('Nama tampilan 2–40 karakter.');
      return;
    }
    if (!email.trim()) {
      setPetunjuk('Isi email dulu.');
      return;
    }
    setPetunjuk('');
    onDaftar({ nama: nama.trim(), email: email.trim(), sandi });
  };

  return (
    <div className="auth-page">
      <section aria-label="Masuk akun" className="auth-hero">
        <p className="auth-logo">
          <span className="centang">✓</span> Taska
        </p>
        <h1>Susun harimu bersama AI</h1>
        <p className="sub">Tulis rencana dengan bahasa sehari-hari — TASKA menyusunnya jadi tugas terjadwal.</p>
        <div className="auth-card">
          <div role="tablist" aria-label="Masuk atau daftar" className="tab-segmented">
            <button type="button" role="tab" aria-selected={tab === 'masuk'} onClick={() => setTab('masuk')}>
              Masuk
            </button>
            <button type="button" role="tab" aria-selected={tab === 'daftar'} onClick={() => setTab('daftar')}>
              Daftar
            </button>
          </div>
          {pesan ? (
            <p role="alert" className="galat">
              {pesan}
            </p>
          ) : null}
          {tab === 'masuk' ? (
            <form onSubmit={kirimMasuk}>
              <label htmlFor="auth-email">Email</label>
              <input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" />
              <label htmlFor="auth-sandi">Sandi</label>
              <input id="auth-sandi" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="current-password" />
              <div className="baris">
                <button type="submit" className="tombol-utama" disabled={sibuk}>
                  Masuk
                </button>
              </div>
              <p className="mikro">RINGKASAN AKUN</p>
              <button type="button" onClick={onGoogle} disabled={sibuk}>
                Masuk dengan Google
              </button>
            </form>
          ) : (
            <form onSubmit={kirimDaftar}>
              <label htmlFor="auth-nama">Nama tampilan</label>
              <input id="auth-nama" type="text" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama untuk sapaan" autoComplete="nickname" maxLength={40} />
              <label htmlFor="auth-email-daftar">Email</label>
              <input id="auth-email-daftar" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email" />
              <label htmlFor="auth-sandi-daftar">Sandi</label>
              <input id="auth-sandi-daftar" type="password" value={sandi} onChange={(e) => setSandi(e.target.value)} autoComplete="new-password" />
              <label htmlFor="auth-setuju">
                <input id="auth-setuju" type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} />
                AI boleh membaca tulisanku
              </label>
              <div className="baris">
                <button type="submit" className="tombol-utama" disabled={sibuk || !setuju}>
                  Daftar
                </button>
              </div>
            </form>
          )}
          <div className="baris">
            <button type="button" onClick={onTamu}>
              Lanjut tanpa akun (mode lokal)
            </button>
          </div>
        </div>
        <div className="kartu-contoh" aria-hidden="true">
          {CONTOH.map((c) => (
            <span key={c} className="contoh">
              {c}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd --prefix client run test -- --run src/components/AuthPage.test.jsx`
Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/AuthPage.jsx client/src/components/AuthPage.test.jsx
git commit -m "feat(client): AuthPage Aeline + unit test"
```

---

### Task 4: Dashboard (Ringkasan bento + shell tab + wiring App)

**Files:**
- Create: `client/src/lib/ringkasan.js`
- Test: `client/src/lib/ringkasan.test.js`
- Create: `client/src/components/Ringkasan.jsx`
- Create: `client/src/components/Dashboard.jsx`
- Modify: `client/src/lib/api.js` (tambah 2 fungsi)
- Modify: `client/src/App.jsx` (gate + profil + header pindah)

**Interfaces:**
- Consumes: `AuthPage` (Task 3), tema (Task 1), `GET/PATCH /api/profile` (Task 2), komponen lama (TaskList, Preview, History, AssistantBox, SaranUrutan, Toast — props tidak berubah).
- Produces: `hitungBento(daftar, now) -> {aktif, mendesak, selesaiPersen, selesaiX, selesaiY, berikut: {jam, nama, hari} | null}`; `Dashboard({pengguna, nama, ...propsApp})`.

- [ ] **Step 1: Write the failing test (ringkasan)**

```js
import { describe, it, expect } from 'vitest';
import { hitungBento } from './ringkasan.js';

const NOW = new Date('2026-10-10T10:00:00');

function t(patch) {
  return { id: 'x', title: 'T', status: 'PENDING', urgency: 'LOW', due_date: null, due_time: null, ...patch };
}

describe('hitungBento', () => {
  it('menghitung aktif, mendesak, persen selesai, dan tugas berikut', () => {
    const daftar = [
      t({ id: 'a', title: 'Rapat', urgency: 'URGENT', due_date: '2026-10-10', due_time: '11:00' }),
      t({ id: 'b', title: 'Beli sepatu', due_date: '2026-10-11', due_time: null }),
      { ...t({ id: 'c' }), status: 'COMPLETED', completed_at: '2026-10-05T08:00:00' },
      { ...t({ id: 'd' }), status: 'COMPLETED', completed_at: '2026-09-01T08:00:00' },
    ];
    const b = hitungBento(daftar, NOW);
    expect(b.aktif).toBe(2);
    expect(b.mendesak).toBe(1);
    expect(b.selesaiX).toBe(1);
    expect(b.selesaiY).toBe(3);
    expect(b.selesaiPersen).toBe(33);
    expect(b.berikut.nama).toBe('Rapat');
    expect(b.berikut.jam).toBe('11:00');
  });

  it('tanpa tugas aktif -> berikut null dan persen 0', () => {
    const b = hitungBento([], NOW);
    expect(b.aktif).toBe(0);
    expect(b.berikut).toBe(null);
    expect(b.selesaiPersen).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd --prefix client run test -- --run src/lib/ringkasan.test.js`
Expected: FAIL with "Failed to resolve import ./ringkasan.js".

- [ ] **Step 3: Write minimal implementation**

```js
// client/src/lib/ringkasan.js — angka kartu bento dari daftar kanonik snake_case.
export function gabungDueMs(dueDate, dueTime) {
  if (!dueDate) return null;
  const d = new Date(`${dueDate}T${dueTime ?? '00:00'}:00`);
  const ms = d.getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function hitungBento(daftar, now = new Date()) {
  const semua = Array.isArray(daftar) ? daftar : [];
  const bulan = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const aktif = semua.filter((t) => (t.status ?? 'PENDING') === 'PENDING');
  const depan = aktif.filter((t) => {
    const due = gabungDueMs(t.due_date, t.due_time);
    return due == null || due >= now.getTime();
  });
  const mendesak = aktif.filter((t) => (t.urgency ?? t.urgensi) === 'URGENT').length;
  const bulanIni = semua.filter((t) => {
    const s = t.completed_at ?? t.completedAt ?? t.updated_at ?? t.updatedAt ?? '';
    return typeof s === 'string' && s.slice(0, 7) === bulan && (t.status ?? '') === 'COMPLETED';
  });
  const selesaiX = bulanIni.length;
  const selesaiY = semua.filter((t) => {
    const s = t.created_at ?? t.createdAt ?? t.updated_at ?? t.updatedAt ?? '';
    return typeof s !== 'string' || s.slice(0, 7) <= bulan;
  }).length;
  const calon = depan
    .map((t) => ({ t, due: gabungDueMs(t.due_date, t.due_time) }))
    .filter((x) => x.due != null)
    .sort((a, b) => a.due - b.due)[0];
  return {
    aktif: depan.length,
    mendesak,
    selesaiX,
    selesaiY,
    selesaiPersen: selesaiY ? Math.round((selesaiX / selesaiY) * 100) : 0,
    berikut: calon
      ? { jam: calon.t.due_time, nama: calon.t.title ?? calon.t.nama ?? '', hari: calon.t.due_date ?? '' }
      : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd --prefix client run test -- --run src/lib/ringkasan.test.js`
Expected: PASS (2/2).

- [ ] **Step 5: Create Ringkasan.jsx + Dashboard.jsx**

```jsx
// client/src/components/Ringkasan.jsx
export default function Ringkasan({ nama, bento }) {
  return (
    <section aria-label="Ringkasan">
      <p className="mikro">RINGKASAN</p>
      <h2>Halo, {nama || 'teman'}</h2>
      <div className="bento-grid">
        <div className="bento bento-lime">
          <p className="mikro">TUGAS AKTIF</p>
          <p className="angka">{bento.aktif}</p>
        </div>
        <div className="bento bento-hitam">
          <p className="mikro">MENDESAK</p>
          <p className="angka">{bento.mendesak}</p>
        </div>
        <div className="bento bento-abu">
          <p className="mikro">SELESAI BULAN INI</p>
          <p className="angka">{bento.selesaiPersen}%</p>
          <p>
            {bento.selesaiX} dari {bento.selesaiY} tugas bulan ini
          </p>
        </div>
        <div className="bento bento-biru">
          <p className="mikro">BERIKUTNYA</p>
          {bento.berikut ? (
            <p>
              {bento.berikut.jam} · {bento.berikut.nama} · {bento.berikut.hari}
            </p>
          ) : (
            <p>Tidak ada jadwal</p>
          )}
        </div>
      </div>
    </section>
  );
}
```

```jsx
// client/src/components/Dashboard.jsx — header + tab state; konten Tugas/Rekap dirakit App via props agar logika tetap di App.
import { useState } from 'react';
import Ringkasan from './Ringkasan.jsx';

export default function Dashboard({ nama, email, tamu, bento, onKeluar, tugas, rekap }) {
  const [tab, setTab] = useState(tamu ? 'tugas' : 'ringkasan');
  const tabs = [
    ['ringkasan', 'Ringkasan'],
    ['tugas', 'Tugas'],
    ['rekap', 'Rekap'],
  ];
  return (
    <div>
      <header className="dash-header">
        <span className="auth-logo" style={{ position: 'static' }}>
          <span className="centang">✓</span> Taska
        </span>
        <nav aria-label="Dashboard" className="nav-pil">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
        <span className="dash-nama">{nama || email || 'Tamu'}</span>
        <button type="button" className="pil-hitam" onClick={onKeluar}>
          Keluar
        </button>
      </header>
      <main>
        {tab === 'ringkasan' && !tamu ? <Ringkasan nama={nama} bento={bento} /> : null}
        {tab === 'ringkasan' && tamu ? <p className="mikro">MASUK UNTUK RINGKASAN</p> : null}
        {tab === 'tugas' ? tugas : null}
        {tab === 'rekap' ? rekap : null}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Tambah helper profil di api.js + bawa completed_at di dariApi**

Di `client/src/lib/api.js`, tambah di akhir:

```js
// GET /api/profile -> {nama, aiConsent, ...} (404 bila belum ada).
export async function muatProfil() {
  return panggilApi('/api/profile');
}

// PATCH /api/profile.
export async function simpanProfil(data) {
  return panggilApi('/api/profile', { method: 'PATCH', body: data });
}
```

(`panggilApi` sudah ada dan tidak diekspor — fungsi baru didefinisikan di file yang sama, di bawahnya.)

Di `client/src/App.jsx`, fungsi `dariApi`: tambah satu baris `completed_at: t.completed_at ?? t.completedAt ?? null,` agar statistik bulan punya tanggal selesai.

- [ ] **Step 7: Restruktur App.jsx (gate + dashboard, logika dipertahankan)**

1. Import: tambah `AuthPage`, `Dashboard`, `hitungBento`, `muatProfil`, `simpanProfil`; hapus yang tak terpakai bila ada.
2. State: hapus `email`/`sandi` lama; tambah `modeTamu` (baca `sessionStorage taskman:tamu`), `tab` tidak perlu (di Dashboard), `profil` ({nama: '', aiConsent: false}), `galatAuth`, `sibukAuth`.
3. Ganti `masuk`/`keluar` lama dengan: `masuk({email, sandi})` (signInWithPassword → galat inline; sukses → muat profil), `daftar({nama, email, sandi})` (signUp → `simpanProfil({nama, aiConsent: true, email})` → toast verifikasi), `masukGoogle()` (signInWithOAuth google + redirectTo origin), `pilihTamu()` (set sessionStorage + state), `keluar()` (signOut + hapus flag tamu + reset profil).
4. Return: bila `supabase && !pengguna && !modeTamu` → `<AuthPage .../>`; selain itu → `<Dashboard nama={profil.nama} ... tugas={<>blok kartu paragraf + TaskList + Preview + SaranUrutan</>} rekap={<History .../>} />` + AssistantBox masuk ke dalam prop `tugas` (kolom kanan, sesuai desain §5.2) + Toast tetap di root. Semua fungsi logika (susun, konfirmasi, ubah, hapus, toggle, timer, migrasi tamu) tidak diubah.
5. Hapus section hero/nav/anchor lama (`nav-tetap`, `tepi-sosial`, `bagian hero/folder/kerja`) — digantikan AuthPage/Dashboard.

- [ ] **Step 8: Run full client suite**

Run: `npm.cmd --prefix client run test -- --run`
Expected: PASS semua.

- [ ] **Step 9: Commit**

```bash
git add client/src/lib/ringkasan.js client/src/lib/ringkasan.test.js client/src/components/Ringkasan.jsx client/src/components/Dashboard.jsx client/src/lib/api.js client/src/App.jsx
git commit -m "feat(client): dashboard tab + bento + wiring auth/profil"
```

---

### Task 5: E2E alur baru + verifikasi akhir (tanpa push)

**Files:**
- Rewrite: `client/e2e/smoke.spec.js`

**Interfaces:**
- Consumes: seluruh hasil Task 1–4. Produces: suite e2e hijau + aplikasi siap diverifikasi manual.

- [ ] **Step 1: Tulis ulang smoke.spec.js**

```js
import { test, expect } from '@playwright/test';

test('pengunjung tanpa sesi melihat halaman masuk', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/susun harimu bersama ai/i)).toBeVisible();
  await expect(page.getByRole('tab', { name: /daftar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /masuk dengan google/i })).toBeVisible();
});

test('tamu -> tab Tugas -> susun -> konfirmasi -> centang', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /lanjut tanpa akun/i }).click();
  await page.getByLabel(/paragraf tugas/i).fill('Rapat jam 9, lalu makan siang. Besok apel pukul 07.30');
  await page.getByRole('button', { name: /susun jadi tugas/i }).click();
  const pratinjau = page.getByLabel(/pratinjau tugas/i);
  await expect(pratinjau).toBeVisible({ timeout: 15000 });
  await pratinjau.getByRole('button', { name: /konfirmasi/i }).first().click();
  await expect(page.locator('[role="status"]', { hasText: /tersimpan/i })).toBeVisible({ timeout: 10000 });
  const pertama = page.locator('.daftar-tugas .tugas').first();
  await expect(pertama).toBeVisible();
  await pertama.getByRole('checkbox').check();
  await expect(pertama).toHaveClass(/selesai/);
});

test('keluar mengembalikan ke halaman masuk', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /lanjut tanpa akun/i }).click();
  await page.getByRole('button', { name: /keluar/i }).click();
  await expect(page.getByText(/susun harimu bersama ai/i)).toBeVisible();
});
```

(Catatan: label `paragraf tugas`, `pratinjau tugas`, dan teks toast `tersimpan` dipertahankan dari implementasi lama — bila Task 4 mengubahnya, sesuaikan selector di sini mengikuti kode Task 4.)

- [ ] **Step 2: Run Playwright**

Run (workdir `client/`): `npx playwright test`
Expected: PASS 3/3 (webServer dev otomatis via `playwright.config.js`).

- [ ] **Step 3: Verifikasi akhir + commit (tanpa push)**

Run: `npm.cmd run test:all`
Expected: PASS (client + api).

```bash
git add client/e2e/smoke.spec.js
git commit -m "test(e2e): alur auth baru + tamu + keluar"
```

Jangan push. Verifikasi manual oleh owner: Supabase dashboard (provider Google aktif + redirect `tasc-phi.vercel.app` + localhost), `prisma db push` ke DB prod, cek live incognito (halaman masuk, daftar nama+consent, bento, tema terang+gelap).

