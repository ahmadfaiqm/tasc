# Taska Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Taska's main page as a single always-light minimalist landing (Misso-style panels + Games-UI fan recap) with login-required auth, without changing API, data logic, or dependencies.

**Architecture:** Restructure `App.jsx`/`Dashboard.jsx` into one ordered landing page; restyle panels in place keeping component prop contracts; rewrite only `History.jsx`'s carousel into a fan with exported pure helpers; lock light theme via a scoped wrapper class.

**Tech Stack:** React 18, plain CSS (`client/src/styles.css`), Vitest + Testing Library, Playwright e2e. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-14-taska-minimalist-redesign-design.md`

## Global Constraints

- No new dependencies (no Tailwind, no framer-motion, no shadcn).
- No API, database, parsing, urgency/priority, reminder, or auth-provider changes (Supabase email + Google OAuth stay).
- All UI copy stays Bahasa Indonesia.
- Unit tests: `npm --prefix client run test -- --run <file>`; full suite: `npm --prefix client run test -- --run`.
- E2E: `cd client && npx playwright test` (dev server auto-starts via `playwright.config.js`).
- Keep existing DOM hooks `.daftar-tugas .tugas` and label `Pratinjau tugas` (e2e depends on them).
- Respect `prefers-reduced-motion` for all new animation.

## Review Focus

- Fan month change must be announced to screen readers → pinned in Task 6 (`aria-live` test).
- Fan must be operable with ←/→ keyboard → pinned in Task 6.
- Double-clicking "Susun jadi tugas" must send only one parse (button disabled while busy) → pinned in Task 3.
- Empty task list must render the empty message with no featured card → pinned in Task 4.
- Enter key in Auth email field must submit login → pinned in Task 1.

## File Structure

- Modify `client/src/components/AuthPage.jsx` — remove guest button, `CONTOH` cards row, `Mulai` CTA; drop `onTamu` prop.
- Modify `client/src/components/AuthPage.test.jsx` — mirror the above.
- Modify `client/src/App.jsx` — always gate on login; single ordered landing; write card + inline `Preview`; busy state for parse.
- Modify `client/src/components/Dashboard.jsx` — landing shell (topbar + greeting + `tugas` + `rekap`), no tabs, no `tamu` prop. Create `client/src/components/Dashboard.test.jsx`.
- Modify `client/src/components/TaskList.jsx`, `TaskItem.jsx` — featured-first + compact rows, meta columns, pastel badges; same props. Create `TaskItem.test.jsx`, `TaskList.test.jsx`.
- Modify `client/src/components/SaranUrutan.jsx` (`{saran, onPilih}`), `AssistantBox.jsx` (`{pesanAwal}`); App wires tap-to-prefill. Create both test files.
- Modify `client/src/components/History.jsx` — 5-window fan + tap-to-open detail, same `{daftar}` prop, exports `hitungKipas`. Create `History.test.jsx`.
- Modify `client/src/styles.css` — `.landing-terang` light lock, cards, fan, breakpoints (in the tasks that need them).
- Modify `client/e2e/smoke.spec.js` — auth-gate specs replacing guest flows.

---

### Task 1: Auth wajib login

**Files:**
- Modify: `client/src/components/AuthPage.jsx`
- Modify: `client/src/components/AuthPage.test.jsx`

**Interfaces:**
- Consumes: `App.jsx` handlers `masuk`, `daftarAkun`, `masukGoogle`.
- Produces: `AuthPage({onMasuk, onDaftar, onGoogle, galat, sibuk, namaAwal})` — `onTamu` prop removed.

- [ ] **Step 1: Update failing tests** — in `AuthPage.test.jsx` remove `onTamu` from props, drop guest-button assertions, assert `queryByRole('button', {name: /lanjut tanpa akun/i})` is null, assert `queryByText(/mulai/i)`-CTA absent and example cards (`/selesai tepat waktu/i`) absent:

```jsx
expect(screen.queryByRole('button', { name: /lanjut tanpa akun/i })).toBeNull();
expect(screen.queryByText(/selesai tepat waktu/i)).toBeNull();
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm --prefix client run test -- --run src/components/AuthPage.test.jsx`
Expected: FAIL (guest button / example cards still render).

- [ ] **Step 3: Implement** — remove `onTamu` prop, guest button block, `CONTOH` array + `kartu-contoh` row, and `cta-lime` "Mulai" link from `AuthPage.jsx`.

- [ ] **Step 4: Add Enter-submits-login test** (Review Focus):

```jsx
it('Enter di email mensubmit login', () => {
  const props = pasang();
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@mail.com' } });
  fireEvent.submit(screen.getByLabelText(/email/i).closest('form'));
  expect(props.onMasuk).toHaveBeenCalledWith({ email: 'a@mail.com', sandi: '' });
});
```

- [ ] **Step 5: Run to verify all pass**

Run: `npm --prefix client run test -- --run src/components/AuthPage.test.jsx`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add client/src/components/AuthPage.jsx client/src/components/AuthPage.test.jsx
git commit -m "feat(auth): login wajib, hapus mode tamu dan kartu contoh"
```

---

### Task 2: App — gate login + satu landing berurutan

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/components/Dashboard.jsx`
- Modify: `client/src/components/Ringkasan.jsx`
- Modify: `client/src/styles.css` (landing base: light lock, topbar, greeting, panels, write card)
- Create: `client/src/components/Dashboard.test.jsx`, `client/src/components/Ringkasan.test.jsx`
- Modify: `client/e2e/smoke.spec.js`

**Interfaces:**
- Consumes: `AuthPage` (Task 1 props), `hitungBento(daftar)`, `saranUrutan(daftar)`, `TaskList`, `Preview`, `History`, `AssistantBox`, `SaranUrutan`.
- Produces: `Dashboard({nama, email, bento, onKeluar, tugas, rekap})` — no `tamu` prop, no tab state; renders `header.topbar` → greeting → `tugas` → `rekap` in DOM order. `Ringkasan({nama, bento})` — same props, renders left productivity panel (big % + yellow activity card), no `bento-*` classes. `App` exposes no guest path: `if (!pengguna) return <AuthPage …/>`.

- [ ] **Step 1: Write failing Dashboard order test**

```jsx
it('tanpa tab: topbar, sapaan, tugas, lalu rekap berurutan', () => {
  render(<Dashboard nama="Budi" bento={{}} onKeluar={() => {}} tugas={<section aria-label="blok-tugas" />} rekap={<section aria-label="blok-rekap" />} />);
  expect(screen.queryByRole('tablist')).toBeNull();
  const els = ['blok-tugas', 'blok-rekap'].map((n) => screen.getByLabel(n));
  expect(els[0].compareDocumentPosition(els[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm --prefix client run test -- --run src/components/Dashboard.test.jsx`
Expected: FAIL (file / tablist exists).

- [ ] **Step 3: Implement `Dashboard`** — topbar (logo, anchor nav Hari ini/Tugas/Rekap/Asisten, nama, Keluar outline), greeting `Halo, {nama}`, then `{tugas}` then `{rekap}`.

- [ ] **Step 4: Write failing Ringkasan test**

```jsx
it('panel kiri: persen besar + kartu aktivitas, tanpa bento', () => {
  render(<Ringkasan nama="Budi" bento={{ aktif: 6, mendesak: 2, selesaiX: 4, selesaiY: 5, selesaiPersen: 80, berikut: null }} />);
  expect(screen.getByText(/80%/)).toBeTruthy();
  expect(document.querySelector('.panel-kiri')).toBeTruthy();
  expect(document.querySelector('.bento-grid')).toBeNull();
});
```

- [ ] **Step 5: Run to verify it fails**

Run: `npm --prefix client run test -- --run src/components/Ringkasan.test.jsx`
Expected: FAIL.

- [ ] **Step 6: Implement `Ringkasan` + landing base CSS** — left panel (context label, big `%`, yellow activity card from `bento`); in `styles.css` add `.landing-terang` light-variable lock (overrides dark `@media`), topbar, greeting, 3-column panels grid, write card, light outline buttons. Auth styles untouched.

- [ ] **Step 7: Implement `App`** — delete `modeTamu`/`pilihTamu`/sessionStorage-guest/`KUNCI_LOKAL`-as-source (keep `KUNCI_ANTRI` retry for logged-in writes); gate `if (!pengguna) return <main className="landing-terang"><AuthPage …/></main>`; wrap landing in `landing-terang`; order: panels → write card → `Preview` inline → `History`; add `sibukSusun` state disabling "Susun jadi tugas" while `mintaParse` is in flight (Review Focus anti-double-submit).

- [ ] **Step 8: Update e2e** — replace the two guest specs with: unauthenticated sees auth with no guest button; auth page has no example cards and no `Mulai` CTA:

```js
test('tanpa login hanya melihat halaman auth', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/susun harimu bersama ai/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /lanjut tanpa akun/i })).toHaveCount(0);
});
```

- [ ] **Step 9: Run unit + build + e2e to verify**

Run: `npm --prefix client run test -- --run src/components/Dashboard.test.jsx src/components/Ringkasan.test.jsx`
Expected: PASS. Then: `npm --prefix client run build`
Expected: success. Then: `cd client && npx playwright test`
Expected: PASS (updated specs only).

- [ ] **Step 10: Commit**

```bash
git add client/src/App.jsx client/src/components/Dashboard.jsx client/src/components/Dashboard.test.jsx client/src/components/Ringkasan.jsx client/src/components/Ringkasan.test.jsx client/src/styles.css client/e2e/smoke.spec.js
git commit -m "feat(app): satu landing berurutan, login wajib"
```

---

### Task 3: Kartu task — featured + baris ringkas

**Files:**
- Modify: `client/src/components/TaskList.jsx`, `client/src/components/TaskItem.jsx`
- Modify: `client/src/styles.css` (landing task styles only)
- Create: `client/src/components/TaskItem.test.jsx`, `client/src/components/TaskList.test.jsx`

**Interfaces:**
- Consumes: `labelUrgensi(urgency)` from `lib/urgensi.js`; `TaskList({daftar, onUbah, onHapus, onToggle})`, `TaskItem({tugas, onUbah, onHapus, onToggle})` — props unchanged.
- Produces: `.task-utama` (first nearest) + `.task-baris` rows inside kept `.daftar-tugas .tugas`; meta columns Waktu/Urgensi/Ingatkan; edit/delete/toggle behavior unchanged.

- [ ] **Step 1: Write failing tests**

```jsx
// TaskList.test.jsx
it('task pertama featured, sisanya baris ringkas', () => {
  render(<TaskList daftar={[t('A'), t('B')]} onUbah={() => {}} onHapus={() => {}} onToggle={() => {}} />);
  expect(document.querySelectorAll('.task-utama')).toHaveLength(1);
  expect(document.querySelectorAll('.task-baris')).toHaveLength(1);
});
it('daftar kosong menampilkan pesan tanpa featured', () => {
  render(<TaskList daftar={[]} onUbah={() => {}} onHapus={() => {}} onToggle={() => {}} />);
  expect(screen.getByText(/belum ada tugas/i)).toBeTruthy();
  expect(document.querySelector('.task-utama')).toBeNull();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm --prefix client run test -- --run src/components/TaskList.test.jsx src/components/TaskItem.test.jsx`
Expected: FAIL (no such classes).

- [ ] **Step 3: Implement** — `TaskList` sorts nearest-first, renders first as featured (`TaskItem` with `varian="utama"` prop, default `"baris"`), rest compact; `TaskItem` adds meta columns + keeps checkbox/edit/delete flows and `.tugas` class.

- [ ] **Step 4: Add TaskItem behavior test**

```jsx
it('checkbox memanggil onToggle, ubah membuka edit', () => {
  const onToggle = vi.fn();
  render(<TaskItem tugas={t('A')} onUbah={() => {}} onHapus={() => {}} onToggle={onToggle} />);
  fireEvent.click(screen.getByRole('checkbox'));
  expect(onToggle).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /ubah a/i }));
  expect(screen.getByLabelText(/judul tugas/i)).toBeTruthy();
});
```

- [ ] **Step 5: Run to verify all pass**

Run: `npm --prefix client run test -- --run src/components/TaskList.test.jsx src/components/TaskItem.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/TaskList.jsx client/src/components/TaskItem.jsx client/src/components/TaskList.test.jsx client/src/components/TaskItem.test.jsx client/src/styles.css
git commit -m "feat(tasks): kartu featured dan baris ringkas"
```

---

### Task 4: Panel asisten — masukan + prefill

**Files:**
- Modify: `client/src/components/SaranUrutan.jsx`, `client/src/components/AssistantBox.jsx`
- Modify: `client/src/App.jsx` (wire `onPilih` → prefill + scroll)
- Create: `client/src/components/SaranUrutan.test.jsx`, `client/src/components/AssistantBox.test.jsx`

**Interfaces:**
- Consumes: `saranUrutan(tasks, now)` → `{pertama, alasan, kedua, sisa}`; `tanyaAsisten(teks)` from `lib/api.js` (mock in tests).
- Produces: `SaranUrutan({saran, onPilih})` — rows call `onPilih(teksBaris)`; `AssistantBox({pesanAwal})` — fills input when `pesanAwal` changes, never auto-sends.

- [ ] **Step 1: Write failing tests**

```jsx
// SaranUrutan.test.jsx
it('klik baris memanggil onPilih', () => {
  const onPilih = vi.fn();
  render(<SaranUrutan saran={{ pertama: 'Laporan', alasan: 'mepet', kedua: '', sisa: [] }} onPilih={onPilih} />);
  fireEvent.click(screen.getByRole('button', { name: /laporan/i }));
  expect(onPilih).toHaveBeenCalledTimes(1);
});
```

```jsx
// AssistantBox.test.jsx
vi.mock('../lib/api.js', () => ({ tanyaAsisten: vi.fn(async () => ({ jawaban: 'ok' })) }));
it('pesanAwal mengisi input tanpa auto-kirim', async () => {
  const { rerender } = render(<AssistantBox pesanAwal="" />);
  rerender(<AssistantBox pesanAwal="Tanya soal: Laporan" />);
  expect(screen.getByLabelText(/tanya asisten/i).value).toBe('Tanya soal: Laporan');
  expect((await import('../lib/api.js')).tanyaAsisten).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm --prefix client run test -- --run src/components/SaranUrutan.test.jsx src/components/AssistantBox.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement** — `SaranUrutan` renders "Masukan cepat" rows (pertama + alasan, kedua, padat-warning derived from count); `AssistantBox` accepts `pesanAwal` via `useEffect` set; `App` holds `prefillAsisten` state, passes setter to `SaranUrutan`/`TaskItem`-level "Tanya AI" as `onPilih={(teks) => { setPrefillAsisten(teks); document.getElementById('asisten')?.scrollIntoView(); }}`; assistant section gets `id="asisten"`.

- [ ] **Step 4: Run to verify all pass**

Run: `npm --prefix client run test -- --run src/components/SaranUrutan.test.jsx src/components/AssistantBox.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/SaranUrutan.jsx client/src/components/AssistantBox.jsx client/src/App.jsx client/src/components/SaranUrutan.test.jsx client/src/components/AssistantBox.test.jsx
git commit -m "feat(assistant): masukan cepat dengan tap-to-prefill"
```

---

### Task 5: Kipas rekap bulanan

**Files:**
- Modify: `client/src/components/History.jsx`
- Modify: `client/src/styles.css` (fan styles only)
- Create: `client/src/components/History.test.jsx`

**Interfaces:**
- Consumes: existing grouping logic in `History.jsx` (`perBulan`, day groups) reused unchanged.
- Produces: `History({daftar})` with 5-card fan; exported pure `hitungKipas(indexAktif, indexKartu) -> {x, r, s, y, z, op}`; active card has `aria-current="true"`; month name in `aria-live="polite"` region; arrows + ←/→ keyboard; tap active card opens day-detail; pastel per-month colors + `★ {persen}%` badge.

- [ ] **Step 1: Write failing tests**

```jsx
import { hitungKipas } from './History.jsx';
it('hitungKipas: tengah penuh, samping miring', () => {
  expect(hitungKipas(2, 2)).toMatchObject({ s: 1 });
  expect(hitungKipas(2, 0).r).toBeLessThan(0);
  expect(hitungKipas(2, 4).r).toBeGreaterThan(0);
});
it('klik kartu samping menjadikannya aktif', () => {
  render(<History daftar={tigaBulan()} />);
  fireEvent.click(screen.getByRole('button', { name: /september/i }));
  expect(screen.getByRole('button', { name: /september/i })).toHaveAttribute('aria-current', 'true');
});
it('panah dan keyboard menggeser; Enter di aktif membuka detail', () => {
  render(<History daftar={tigaBulan()} />);
  fireEvent.click(screen.getByLabelText(/bulan berikutnya/i));
  expect(screen.getByLabelText(/bulan aktif/i)).toHaveTextContent(/november/i);
  fireEvent.keyDown(screen.getByLabelText(/kipas bulanan/i), { key: 'ArrowLeft' });
  expect(screen.getByLabelText(/bulan aktif/i)).toHaveTextContent(/oktober/i);
  expect(screen.getByLabelText(/bulan aktif/i)).toHaveAttribute('aria-live', 'polite');
  fireEvent.keyDown(screen.getByRole('button', { current: true }), { key: 'Enter' });
  expect(screen.getByText(/tugas · .* selesai/i)).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm --prefix client run test -- --run src/components/History.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement `hitungKipas(indexAktif, indexKartu)`** — `off = indexKartu - indexAktif; x=off*92, r=off*9, s=off===0?1:max(.82,1-|off|*.08), y=|off|*12, z=10-|off|, op=|off|>2?0:1`.

- [ ] **Step 4: Implement fan** — window of 5 month keys around `terpilih` (empty months dimmed, not clickable-to-open but clickable-to-center); arrows shift `terpilih`; `detailTerbuka` state (month key or null) gates day-detail; `aria-live="polite"` month label; `role="listbox"`-ish keyboard on fan container.

- [ ] **Step 5: Run to verify all pass**

Run: `npm --prefix client run test -- --run src/components/History.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/History.jsx client/src/components/History.test.jsx client/src/styles.css
git commit -m "feat(rekap): kipas kartu dengan detail per hari"
```

---

### Task 6: Responsif + gerak + suite hijau

**Files:**
- Modify: `client/src/styles.css` (breakpoints, reduced motion)
- Modify: `client/src/components/History.jsx` (compact fan via exported `pilihJarak(lebarPx)`)

**Interfaces:**
- Consumes: `hitungKipas` (Task 5).
- Produces: `pilihJarak(lebarPx) -> number` (`<420 → 58`, else `92`); breakpoints `1024px` (panels stack: task full-width first) and `700px` (single column, compact fan); `@media (prefers-reduced-motion: reduce)` kills fan transitions.

- [ ] **Step 1: Write failing test**

```jsx
it('pilihJarak ringkas di layar kecil', () => {
  expect(pilihJarak(390)).toBe(58);
  expect(pilihJarak(1100)).toBe(92);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm --prefix client run test -- --run src/components/History.test.jsx`
Expected: FAIL (`pilihJarak` not exported).

- [ ] **Step 3: Implement** — export `pilihJarak`; `History` tracks `window.innerWidth` (resize listener) and uses it for fan `x`; add breakpoint CSS + reduced-motion rule.

- [ ] **Step 4: Full verification**

Run: `npm --prefix client run test -- --run`
Expected: all suites PASS. Then: `npm --prefix client run build`
Expected: success. Then: `cd client && npx playwright test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/styles.css client/src/components/History.jsx client/src/components/History.test.jsx
git commit -m "feat(responsive): breakpoint tablet/hp dan reduced motion"
```
