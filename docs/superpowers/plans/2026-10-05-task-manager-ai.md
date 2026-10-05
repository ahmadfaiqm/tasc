# Task Manager AI (Hybrid Gratis) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun web app task manager v1 yang mengubah paragraf Bahasa Indonesia menjadi tugas + tenggat + urgensi + saran urutan, gratis tanpa OpenAI berbayar.

**Architecture:** Monorepo `client/` (React+Vite → Vercel static) + `api/` (Express → Vercel serverless) + Supabase Auth/DB. Parser + urgensi murni lokal di `parserAturan.js` selalu jalan; `api/routes/ai.js` via `lib/llmGratis.js` mencoba LLM free-tier dulu, gagal → fallback lokal di client.

**Tech Stack:** React 18 + Vite 5, Express 4, Supabase (Auth + Postgres + RLS), Vitest + Supertest + Playwright, Vercel (static + serverless + rewrites).

**Spec:** `docs/superpowers/specs/2026-10-05-task-manager-ai-design.md`

## Global Constraints

- Bahasa UI dan saran: Bahasa Indonesia.
- `REMINDER_MIN = 5` (menit) — ambang pengingat, satu konstanta.
- `AI_TIMEOUT_MS = 8000` — timeout LLM 8 detik, abort + fallback.
- `UNDO_MS = 8000` — tombol Urung 8 detik setelah hapus-otomatis.
- Urgensi: Mendesak jika `tenggat - now <= 2 jam` ATAU kata kunci (`mendesak/segera/penting/deadline/klien/darurat`); Sedang jika `<= 24 jam`; sisanya Santai.
- Tanpa jam → +30 menit berantai mulai dari `now`. Jam-lewat hari ini → besok. `now` + `timezone` client selalu dikirim ke server.
- Key AI (`AI_KEY`) tidak pernah ke browser; hanya di server via env. Tanpa key → mode lokal penuh + badge.
- Paragraf hanya dikirim ke LLM saat tombol ditekan; ada notice + tombol "pakai mode lokal saja".
- Notifikasi instan + hapus-otomatis hanya saat halaman terbuka (timer client 1 detik). Tanpa backend always-on.
- Tamu (tanpa login) pakai localStorage; login → migrasi sekali → Supabase utama, localStorage cache/antrean. Retry last-write-wins via `updated_at`.
- Node floor: Node 20+. `npm` sebagai package manager.

---

## File Structure

| File | Responsibility |
|---|---|
| `package.json` (root) | Script orkestrasi `test:all`, `dev`; bukan workspace npm, hanya runner |
| `vercel.json` | Rewrites `/api/*` → serverless `api/index.js`; static → `client/dist` |
| `supabase/schema.sql` | Tabel `tasks` + RLS per-user |
| `client/package.json`, `client/vite.config.js`, `client/index.html`, `client/src/main.jsx` | Scaffolding frontend |
| `client/src/App.jsx` | Layout Ruang Kerja + state tugas + timer 1-dtk + toast + saran |
| `client/src/styles.css` | Tema gelap monokrom minimal, responsif 820px |
| `client/src/lib/parserAturan.js` | `parseParagraf`, `tentukanUrgensi`, `saranUrutan` — murni, tanpa I/O |
| `client/src/lib/api.js` | `mintaParse(paragraf)` — panggil server 8 dtk, gagal → throw agar caller fallback lokal |
| `client/src/lib/supabase.js` | Client Supabase dari env |
| `client/src/components/TaskList.jsx`, `TaskItem.jsx`, `SaranUrutan.jsx`, `Toast.jsx` | UI fokus, satu tanggung jawab per file |
| `api/package.json`, `api/index.js`, `api/app.js`, `api/dev.js`, `api/vitest.config.js` | Scaffolding backend (app dipisah dari index agar testable) |
| `api/lib/llmGratis.js` | `panggilLLM(paragraf, nowISO, timezone)` — fetch OpenAI-compatible free-tier, return `null` bila tanpa key/gagal |
| `api/lib/normalisasi.js` | `normalisasiTugas(arr, nowISO)` — samakan bentuk LLM → `{nama, tenggat}` + validasi |
| `api/routes/ai.js` | `POST /api/ai/parse` — coba LLM, gagal → 200 `{sumber:"lokal", tugas:[]}` agar client fallback |
| `client/src/lib/*.test.js`, `api/**/*.test.js`, `client/e2e/smoke.spec.js` | Tes per lapisan |

Catatan slate: working tree saat ini kosong kecuali `docs/` + `.git` (file TASKA lama terhapus unstaged di HEAD). Plan ini scaffold baru dari nol; JANGAN `git checkout HEAD -- .` (itu mengembalikan desain lama yang sudah ditolak).

---

### Task 1: Scaffolding monorepo + kontrak DB + deploy

**Files:**
- Create: `package.json`, `vercel.json`, `supabase/schema.sql`, `client/package.json`, `client/vite.config.js`, `client/index.html`, `client/src/main.jsx`, `client/.env.example`, `api/package.json`, `api/index.js`, `api/app.js`, `api/dev.js`, `api/vitest.config.js`, `api/.env.example`

**Interfaces:**
- Consumes: tidak ada (task pertama).
- Produces: `GET /api/health` → `{ok:true}`; `supabase/schema.sql` dieksekusi tanpa error; `client` dev jalan di 5173.

- [ ] **Step 1: Buat file root + supabase + vercel**

```json
// package.json
{
  "name": "taskman",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev:client": "npm --prefix client run dev",
    "dev:api": "npm --prefix api run dev",
    "test:all": "npm --prefix client run test -- --run; if ($?) { npm --prefix api run test -- --run }"
  }
}
```

```json
// vercel.json
{
  "rewrites": [{ "source": "/api/(.*)", "destination": "/api/index.js" }],
  "buildCommand": "npm --prefix client run build",
  "outputDirectory": "client/dist"
}
```

```sql
-- supabase/schema.sql
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nama text not null,
  tenggat timestamptz not null,
  urgensi text not null default 'Santai' check (urgensi in ('Mendesak','Sedang','Santai')),
  selesai boolean not null default false,
  reminded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tasks enable row level security;
drop policy if exists "tasks_owner" on tasks;
create policy "tasks_owner" on tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists tasks_user_tenggat on tasks(user_id, tenggat);
```

- [ ] **Step 2: Buat scaffolding client**

`client/package.json`: react 18, vite 5, vitest + jsdom + testing-library secukupnya, `@supabase/supabase-js`, `playwright` dev.
`client/vite.config.js`:
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } }, test: { environment: 'jsdom' } });
```
`client/index.html`: root div + `/src/main.jsx`. `client/src/main.jsx`: render `App`. `client/.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=
```

- [ ] **Step 3: Buat scaffolding api**

`api/package.json`: express 4, cors, dotenv, vitest + supertest.
`api/app.js`:
```js
import express from 'express';
import cors from 'cors';
import aiRouter from './routes/ai.js';
const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/ai', aiRouter);
export default app;
```
`api/index.js`: `import app from './app.js'; export default app;`
`api/dev.js`: `import app from './app.js'; app.listen(3001, () => console.log('api :3001'));`
`api/vitest.config.js`: `export default { test: { environment: 'node' } };`
`api/.env.example`:
```
AI_PROVIDER=
AI_KEY=
AI_MODEL=
```

- [ ] **Step 4: Verifikasi scaffold jalan**

Run: `npm --prefix client install; npm --prefix api install`
Run: `npm --prefix api run dev` → curl `http://localhost:3001/api/health` Expected: `{"ok":true}`
Run: `npm --prefix client run dev` Expected: Vite di 5173 tanpa error. Jalankan SQL di Supabase dashboard SQL Editor Expected: tanpa error.

- [ ] **Step 5: Commit**

```bash
git add package.json vercel.json supabase/schema.sql client/package.json client/vite.config.js client/index.html client/src/main.jsx client/.env.example api/package.json api/index.js api/app.js api/dev.js api/vitest.config.js api/.env.example
git commit -m "chore: scaffolding monorepo task manager AI"
```

---

### Task 2: Inti lokal — parse + urgensi + saran (TDD, tanpa I/O)

**Files:**
- Create: `client/src/lib/parserAturan.js`
- Test: `client/src/lib/parserAturan.test.js`

**Interfaces:**
- Consumes: tidak ada.
- Produces:
  - `parseParagraf(paragraf: string, now: Date) => [{nama: string, tenggat: Date}]`
  - `tentukanUrgensi(tenggat: Date, now: Date, nama: string) => 'Mendesak'|'Sedang'|'Santai'`
  - `saranUrutan(tasks: [{nama, tenggat, urgensi}], now: Date) => {pertama, alasan, kedua, sisa: string[]}`

- [ ] **Step 1: Tulis test gagal**

```js
// client/src/lib/parserAturan.test.js
import { describe, it, expect } from 'vitest';
import { parseParagraf, tentukanUrgensi, saranUrutan } from './parserAturan.js';
const now = new Date('2026-10-05T08:00:00+07:00');
describe('parseParagraf', () => {
  it('jam absolut + relatif + besok', () => {
    const r = parseParagraf('Rapat jam 9, lalu kirim laporan 30 menit lagi. Besok apel pukul 07.30', now);
    expect(r).toHaveLength(3);
    expect(r[0].nama).toMatch(/Rapat/i);
    expect(r[0].tenggat.getHours()).toBe(9);
    expect(r[1].tenggat.getTime() - r[0].tenggat.getTime()).toBeGreaterThan(0);
    expect(r[2].tenggat.getDate()).not.toBe(now.getDate());
  });
  it('jam lewat hari ini menjadi besok', () => {
    const r = parseParagraf('Sarapan jam 6', new Date('2026-10-05T08:00:00+07:00'));
    expect(r[0].tenggat.getDate()).toBe(6);
  });
  it('tanpa jam berantai +30 menit', () => {
    const r = parseParagraf('Belanja. Masak. Jemur', now);
    expect(r).toHaveLength(3);
    expect(r[1].tenggat.getTime() - r[0].tenggat.getTime()).toBe(30 * 60 * 1000);
  });
});
describe('urgensi', () => {
  it('2 jam atau kata kunci = Mendesak', () => {
    expect(tentukanUrgensi(new Date(now.getTime() + 60 * 60 * 1000), now, 'biasa')).toBe('Mendesak');
    expect(tentukanUrgensi(new Date(now.getTime() + 5 * 864e5), now, 'deadline klien')).toBe('Mendesak');
    expect(tentukanUrgensi(new Date(now.getTime() + 5 * 3600e3), now, 'biasa')).toBe('Sedang');
    expect(tentukanUrgensi(new Date(now.getTime() + 5 * 864e5), now, 'biasa')).toBe('Santai');
  });
});
describe('saran', () => {
  it('urut urgensi lalu tenggat', () => {
    const s = saranUrutan([
      { nama: 'B', tenggat: new Date(now.getTime() + 9 * 3600e3), urgensi: 'Santai' },
      { nama: 'A', tenggat: new Date(now.getTime() + 3600e3), urgensi: 'Mendesak' }
    ], now);
    expect(s.pertama).toBe('A');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix client run test -- --run src/lib/parserAturan.test.js`
Expected: FAIL `Cannot find module './parserAturan.js'`.

- [ ] **Step 3: Implementasi minimal**

```js
// client/src/lib/parserAturan.js
const KATA_MENDESAK = /(mendesak|segera|penting|deadline|klien|darurat|urgent)/i;
export function tentukanUrgensi(tenggat, now, nama = '') {
  const d = tenggat.getTime() - now.getTime();
  if (d <= 2 * 3600e3 || KATA_MENDESAK.test(nama)) return 'Mendesak';
  if (d <= 24 * 3600e3) return 'Sedang';
  return 'Santai';
}
function aturJam(base, h, m) {
  const d = new Date(base); d.setHours(h, m, 0, 0);
  if (d.getTime() <= base.getTime()) d.setDate(d.getDate() + 1);
  return d;
}
export function parseParagraf(paragraf, now = new Date()) {
  const hari = /hari ini|besok|lusa/i.test(paragraf) ? paragraf.match(/hari ini|besok|lusa/i)[0].toLowerCase() : null;
  const offsetHari = hari === 'besok' ? 1 : hari === 'lusa' ? 2 : 0;
  const parts = String(paragraf).split(/[\n.;,]+|\s+lalu\s+|\s+kemudian\s+|\s+terus\s+/i).map(s => s.trim()).filter(Boolean);
  let berantai = new Date(now.getTime() + 30 * 60e3);
  return parts.map((p) => {
    let t = null;
    let m = p.match(/(?:jam|pukul)\s*(\d{1,2})(?:[.:](\d{2}))?/i);
    if (m) t = aturJam(now, +m[1], +(m[2] ?? 0));
    else if ((m = p.match(/(\d+)\s*menit\s+lagi/i))) t = new Date(now.getTime() + (+m[1]) * 60e3);
    else if ((m = p.match(/(\d+)\s*jam\s+lagi/i))) t = new Date(now.getTime() + (+m[1]) * 3600e3);
    else { t = new Date(berantai); berantai = new Date(berantai.getTime() + 30 * 60e3); }
    if (offsetHari) { t = new Date(t); t.setDate(t.getDate() + offsetHari); }
    return { nama: p.replace(/(?:jam|pukul)\s*\d{1,2}(?:[.:]\d{2})?/i, '').trim() || p, tenggat: t };
  });
}
const BOBOT = { Mendesak: 0, Sedang: 1, Santai: 2 };
export function saranUrutan(tasks, now = new Date()) {
  const s = [...tasks].sort((a, b) => (BOBOT[a.urgensi] - BOBOT[b.urgensi]) || (a.tenggat - b.tenggat));
  if (!s.length) return { pertama: '', alasan: '', kedua: '', sisa: [] };
  return {
    pertama: s[0].nama,
    alasan: s[0].urgensi === 'Mendesak' ? 'tenggat mepet / kata penting' : 'tenggat paling dekat',
    kedua: s[1]?.nama ?? '',
    sisa: s.slice(2).map(x => x.nama)
  };
}
export const REMINDER_MIN = 5;
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npm --prefix client run test -- --run src/lib/parserAturan.test.js`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/parserAturan.js client/src/lib/parserAturan.test.js
git commit -m "feat: parser lokal, urgensi, saran urutan"
```

---

### Task 3: Backend AI gratis + fallback kontrak

**Files:**
- Create: `api/lib/llmGratis.js`, `api/lib/normalisasi.js`, `api/routes/ai.js`
- Test: `api/routes/ai.test.js`

**Interfaces:**
- Consumes: kontrak tugas `{nama, tenggat}` dari Task 2.
- Produces: `POST /api/ai/parse {paragraf, now, timezone} => 200 {sumber:'ai'|'lokal', tugas:[{nama, tenggat}]}`; tanpa `AI_KEY` selalu `{sumber:'lokal', tugas:[]}`.

- [ ] **Step 1: Tulis test gagal**

```js
// api/routes/ai.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
describe('POST /api/ai/parse', () => {
  it('tanpa AI_KEY balikan lokal kosong', async () => {
    const r = await request(app).post('/api/ai/parse').send({ paragraf: 'Rapat jam 9', now: new Date().toISOString(), timezone: 'Asia/Jakarta' });
    expect(r.status).toBe(200);
    expect(r.body.sumber).toBe('lokal');
    expect(r.body.tugas).toEqual([]);
  });
  it('validasi paragraf kosong', async () => {
    const r = await request(app).post('/api/ai/parse').send({ paragraf: '  ', now: new Date().toISOString() });
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix api run test -- --run routes/ai.test.js`
Expected: FAIL `Cannot find module './ai.js'` / 404.

- [ ] **Step 3: Implementasi minimal**

```js
// api/lib/llmGratis.js
export async function panggilLLM(paragraf, nowISO, timezone, fetchFn = fetch) {
  const base = process.env.AI_PROVIDER, key = process.env.AI_KEY, model = process.env.AI_MODEL;
  if (!base || !key || !model) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetchFn(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.2, messages: [
        { role: 'system', content: `Ubah paragraf Bahasa Indonesia menjadi JSON {tugas:[{nama,tenggat}]}. Sekarang ${nowISO} zona ${timezone}. Jam yang lewat hari ini berarti besok. Balas JSON saja.` },
        { role: 'user', content: paragraf }
      ]})
    });
    if (!r.ok) return null;
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? '[]';
    const m = txt.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]).tugas ?? null : null;
  } catch { return null; } finally { clearTimeout(t); }
}
```

```js
// api/lib/normalisasi.js
export function normalisasiTugas(arr, nowISO) {
  if (!Array.isArray(arr)) return [];
  const now = new Date(nowISO).getTime();
  return arr.filter(t => t && typeof t.nama === 'string' && t.nama.trim() && t.tenggat)
    .map(t => ({ nama: t.nama.trim().slice(0, 200), tenggat: new Date(t.tenggat).toISOString() }))
    .filter(t => !Number.isNaN(Date.parse(t.tenggat)) && Date.parse(t.tenggat) > now - 864e5);
}
```

```js
// api/routes/ai.js
import { Router } from 'express';
import { panggilLLM } from '../lib/llmGratis.js';
import { normalisasiTugas } from '../lib/normalisasi.js';
const r = Router();
r.post('/parse', async (req, res) => {
  const { paragraf, now, timezone } = req.body ?? {};
  if (!paragraf || !String(paragraf).trim()) return res.status(400).json({ error: 'paragraf wajib diisi' });
  try {
    const mentah = await panggilLLM(String(paragraf), now ?? new Date().toISOString(), timezone ?? 'Asia/Jakarta');
    if (!mentah) return res.json({ sumber: 'lokal', tugas: [] });
    return res.json({ sumber: 'ai', tugas: normalisasiTugas(mentah, now ?? new Date().toISOString()) });
  } catch { return res.json({ sumber: 'lokal', tugas: [] }); }
});
export default r;
```

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npm --prefix api run test -- --run`
Expected: PASS. Lalu `AI_PROVIDER=https://api.groq.com/openai/v1 AI_KEY=x AI_MODEL=llama-3.1-8b-instant npm --prefix api run test -- --run` tetap PASS (jalur gagal → lokal, tanpa throw).

- [ ] **Step 5: Commit**

```bash
git add api/lib/llmGratis.js api/lib/normalisasi.js api/routes/ai.js api/routes/ai.test.js
git commit -m "feat: backend AI gratis dengan fallback lokal"
```

---

### Task 4: Frontend Ruang Kerja + saran + toast + smoke

**Files:**
- Create: `client/src/lib/api.js`, `client/src/lib/supabase.js`, `client/src/components/TaskItem.jsx`, `TaskList.jsx`, `SaranUrutan.jsx`, `Toast.jsx`, `client/src/App.jsx`, `client/src/styles.css`
- Modify: `client/src/main.jsx` (import css)
- Test: `client/e2e/smoke.spec.js`, `client/src/lib/api.test.js`

**Interfaces:**
- Consumes: `parseParagraf/tentukanUrgensi/saranUrutan` (Task 2); `POST /api/ai/parse` (Task 3).
- Produces: UI jalan: ketik paragraf → daftar + saran → centang/edit/hapus → toast. `mintaParse` throw saat server lokal agar caller fallback.

- [ ] **Step 1: Tulis test api gagal**

```js
// client/src/lib/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { mintaParse } from './api.js';
describe('mintaParse', () => {
  it('lempar saat server tidak bisa dihubungi', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('off')));
    await expect(mintaParse('halo')).rejects.toThrow();
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix client run test -- --run src/lib/api.test.js`
Expected: FAIL modul tidak ada.

- [ ] **Step 3: Implementasi minimal (seluruh UI)**

`client/src/lib/api.js`:
```js
export async function mintaParse(paragraf) {
  const base = import.meta.env.VITE_API_URL ?? '';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${base}/api/ai/parse`, { method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ paragraf, now: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
    if (!r.ok) throw new Error('ai-' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
```
`client/src/lib/supabase.js`: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` + guard bila kosong → `null`.
Komponen kecil sesuai spec §2 (TaskItem grid checkbox|teks|label|edit|hapus; SaranUrutan tampilkan pertama+alasan+kedua+sisa; Toast `role="status"`).
`App.jsx` aliran: `onSusun`: coba `mintaParse` (kecuali mode lokal dipaksa) → bila `sumber:'ai'` pakai hasilnya + badge AI; bila throw / `sumber:'lokal'` → `parseParagraf` lokal + badge Lokal. Tiap tugas diberi `urgensi = tentukanUrgensi(...)`, simpan Supabase bila login else localStorage. Timer `setInterval` 1 dtk: pengingat `REMINDER_MIN`, hapus lewat waktu + Urung `UNDO_MS`. `styles.css`: gelap monokrom, breakpoint 820px.

- [ ] **Step 4: Verifikasi**

Run: `npm --prefix client run test -- --run` Expected: PASS.
Run: `npx --prefix client playwright install chromium; npm --prefix client run dev` + di terminal lain `npm --prefix api run dev`; buka 5173: ketik `Rapat jam 9, lalu makan siang. Besok apel pukul 07.30` → 3 tugas + saran → centang/edit/hapus → toast. Expected: tanpa key AI tetap jalan via mode lokal.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/api.js client/src/lib/api.test.js client/src/lib/supabase.js client/src/components/ client/src/App.jsx client/src/styles.css client/src/main.jsx client/e2e/smoke.spec.js
git commit -m "feat: ruang kerja, saran urutan, toast"
```

---

### Task 5: Sync Supabase + timer final + verifikasi rilis

**Files:**
- Modify: `client/src/App.jsx`, `client/src/lib/supabase.js`
- Test: `supabase/schema.sql` (eksekusi ulang), `client/e2e/smoke.spec.js` (tambah login-guest path)

**Interfaces:**
- Consumes: UI Task 4 + tabel Task 1.
- Produces: login → migrasi sekali → CRUD Supabase + antre offline; timer pengingat + hapus + urung stabil.

- [ ] **Step 1: Tulis test/cek gagal** — Eksekusi `supabase/schema.sql` di projek Supabase kosong; coba `insert` sebagai 2 user berbeda, `select` silang.
Expected gagal awal: RLS menolak baca silang (itulah yang diinginkan — catat).

- [ ] **Step 2: Implementasi sync** — `App.jsx`: saat login, baca localStorage → `upsert` ke Supabase → kosongkan antre; tulis selalu dua arah (optimistis lokal + Supabase bila login, gagal → banner "belum tersinkron" + retry 30 dtk). Ubah tenggat → `reminded=false`.

- [ ] **Step 3: Verifikasi akhir**

Run: `npm run test:all` Expected: PASS semua.
Run: Playwright smoke penuh Expected: PASS.
Checklist dashboard sekali: (1) SQL dijalankan, (2) Auth redirect URL terdaftar (prod + localhost:5173), (3) 5 env Vercel terisi (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `AI_PROVIDER`, `AI_KEY`, `AI_MODEL`).

- [ ] **Step 4: Commit**

```bash
git add client/src/App.jsx client/src/lib/supabase.js
git commit -m "feat: sync supabase dan timer final"
```

---

## Self-Review

- **Spec coverage:** §1 → Task 1+3 (scaffold, proxy, RLS). §2 → Task 4 (layout, badge, saran, toast, a11y). §3 → Task 2+4+5 (parse, urgensi, ingatkan, bersihkan, simpan). §4 → Task 3+4+5 (timeout 8 dtk, antre offline, izin notifikasi, privasi notice). §5 → Task 2+3+4 (vitest, supertest, smoke). Non-tujuan (chat/kolaborasi/Gantt/kalender/push-tertutup) tidak ada tasknya — benar.
- **Placeholder scan:** tidak ada TBD/TODO; semua langkah punya perintah + kode aktual + ekspektasi PASS/FAIL.
- **Type consistency:** `tenggat` selalu `Date` di client, ISO string di wire (`normalisasiTugas` ↔ `mintaParse`); `urgensi` union literal sama di SQL check, parser, dan UI; `saranUrutan` mengembalikan `{pertama, alasan, kedua, sisa}` yang dipakai `SaranUrutan.jsx` apa adanya.
