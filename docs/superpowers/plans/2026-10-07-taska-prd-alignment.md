# TASKA PRD Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selaraskan seluruh sistem dengan PRD v0.3 + dbdiagram (MVP P0 penuh) dengan Prisma sebagai DAL di API + Supabase Postgres/Auth.

**Architecture:** `prisma/schema.prisma` mirror dbdiagram (9 tabel + 11 enum); `supabase/schema.sql` reset total + RLS; `api/` satu-satunya penulis DB via Prisma + JWT Supabase, client hanya Auth + panggil API; parser rewrite no-fake-time; frontend Quick Capture -> preview -> confirm.

**Tech Stack:** Node 20+, Express 4, Prisma 5 + Postgres (Supabase pooled), Zod 3, Supabase Auth (supabase-js hanya Auth), React 18 + Vite 5, Vitest + Supertest + Playwright.

**Spec:** `docs/superpowers/specs/2026-10-07-taska-prd-alignment-design.md`

## Global Constraints

- Bahasa UI dan saran: Bahasa Indonesia.
- `REMINDER_MIN = 5`, `AI_TIMEOUT_MS = 8000`, `UNDO_MS = 8000`, `CONFLICT_GAP_MIN = 45`, `BUSY_DAY_N = 4`.
- Tanpa jam eksplisit -> `due_time = null`, `time_precision = UNSPECIFIED`, tampil "Jam belum ditentukan". Dilarang mengarang jam.
- Urgency: `<= 2 jam URGENT`, `<= 24 jam NORMAL`, sisanya `LOW`.
- Priority: `HIGH/MEDIUM/LOW` + `priority_source USER/AI/SYSTEM` (default SYSTEM=MEDIUM).
- Status: `PENDING/COMPLETED/CANCELLED`; OVERDUE dihitung (`PENDING AND due < now`), bukan status permanen.
- `AI_KEY` hanya di server via env; tanpa key -> mode lokal penuh + badge.
- Paragraf hanya dikirim ke LLM saat tombol ditekan; ada notice + tombol mode lokal saja.
- Reminder hanya bila `due_time != null`, idempoten PENDING->SENT sekali.
- User isolation: semua query filter `user_id`; user tak bisa akses milik orang lain.
- Node floor: Node 20+. `npm` sebagai package manager.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Source of truth ORM, 1:1 dengan dbdiagram.dbml |
| `api/package.json` | Tambah `@prisma/client`, `prisma` dev, `zod`, `@supabase/supabase-js` (verifikasi JWT) |
| `api/.env.example` | Tambah `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET` |
| `supabase/schema.sql` | Reset total 9 tabel + RLS + index (dieksekusi di dashboard) |
| `api/lib/prisma.js` | Singleton PrismaClient |
| `api/lib/auth.js` | Middleware Bearer JWT -> `req.userId` (guard 401) |
| `api/lib/validasi.js` | Skema Zod parse/task/chat/settings |
| `api/lib/prioritas.js` | `tentukanUrgency`, `saranPriority` deterministik |
| `api/lib/llmGratis.js` | Rewrite prompt structured output PRD §32 |
| `api/lib/normalisasi.js` | Rewrite samakan LLM -> kontrak PRD |
| `api/routes/tasks.js` | CRUD + complete/cancel/reopen + sweep |
| `api/routes/ai.js` | Rewrite parse kontrak baru + chat read-only |
| `api/routes/history.js` | Agregasi month->day->status |
| `api/routes/notifications.js` | Settings + subscribe |
| `api/app.js` | Daftarkan router baru + auth |
| `client/src/lib/parserAturan.js` | Rewrite no-fake-time + assumption |
| `client/src/lib/api.js` | Rewrite kirim Bearer JWT |
| `client/src/components/Preview.jsx` | Baru: daftar kandidat + Confirm/Edit/Cancel |
| `client/src/components/History.jsx` | Baru: ringkasan bulanan |
| `client/src/components/AssistantBox.jsx` | Baru: chat read-only |
| `client/src/App.jsx` | Alur preview + history + assistant |

---

### Task 1: Prisma schema + reset DB + wiring API

**Files:**
- Create: `prisma/schema.prisma`, `api/lib/prisma.js`, `api/lib/auth.js`
- Modify: `api/package.json`, `api/.env.example`, `supabase/schema.sql`, `api/app.js`
- Test: `api/lib/prisma.test.js`

**Interfaces:**
- Consumes: `dbdiagram.dbml` (9 tabel + 11 enum).
- Produces: `prisma` singleton (`import prisma from '../lib/prisma.js'`), `wajibAuth(req,res,next)` set `req.userId`, tabel baru via `schema.sql`.

- [ ] **Step 1: Tambah deps API**

Run: `npm --prefix api install @prisma/client zod @supabase/supabase-js; if ($?) { npm --prefix api install -D prisma }`
Expected: `api/package.json` berisi ketiganya.

- [ ] **Step 2: Tulis prisma/schema.prisma (faithful dbdiagram)**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
generator client {
  provider = "prisma-client-js"
}
enum AuthProvider { LOCAL GOOGLE }
enum TaskStatus { PENDING COMPLETED CANCELLED }
enum UrgencyLevel { URGENT NORMAL LOW }
enum PriorityLevel { HIGH MEDIUM LOW }
enum ValueSource { USER AI SYSTEM }
enum TimePrecision { EXACT PERIOD UNSPECIFIED }
enum ReminderStatus { PENDING SENT FAILED CANCELLED }
enum NotificationType { IN_APP BROWSER PUSH }
enum AiInteractionType { TASK_PARSING TASK_PRIORITIZATION ASSISTANT_CHAT TASK_ACTION PRODUCTIVITY_INSIGHT }
enum AiActionType { CREATE_TASK UPDATE_TASK COMPLETE_TASK CANCEL_TASK DELETE_TASK }
enum AiActionStatus { PENDING CONFIRMED COMPLETED FAILED CANCELLED }

model User {
  id           String   @id @db.Uuid
  name         String?  @db.VarChar(100)
  email        String   @unique @db.VarChar(255)
  passwordHash String?  @map("password_hash") @db.VarChar(255)
  authProvider AuthProvider @default(LOCAL) @map("auth_provider")
  timezone     String   @default("Asia/Jakarta") @db.VarChar(100)
  createdAt    DateTime @map("created_at") @db.Timestamp(6)
  updatedAt    DateTime @map("updated_at") @db.Timestamp(6)
  tasks        Task[]
  aiInteractions AiInteraction[]
  recommendations TaskRecommendation[]
  aiActions    AiAction[]
  notifSettings NotificationSetting?
  notifSubs    NotificationSubscription[]
  @@map("users")
}
model Task {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title          String   @db.VarChar(255)
  description    String?  @db.Text
  sourceText     String?  @map("source_text") @db.Text
  dueDate        DateTime? @map("due_date") @db.Date
  dueTime        DateTime? @map("due_time") @db.Time
  timePrecision  TimePrecision @default(UNSPECIFIED) @map("time_precision")
  durationMinutes Int?    @map("duration_minutes")
  durationSource ValueSource? @map("duration_source")
  urgency        UrgencyLevel @default(NORMAL)
  priority       PriorityLevel @default(MEDIUM)
  prioritySource ValueSource @default(SYSTEM) @map("priority_source")
  status         TaskStatus @default(PENDING)
  aiAssumption   String?  @map("ai_assumption") @db.Text
  completedAt    DateTime? @map("completed_at") @db.Timestamp(6)
  cancelledAt    DateTime? @map("cancelled_at") @db.Timestamp(6)
  deletedAt      DateTime? @map("deleted_at") @db.Timestamp(6)
  createdAt      DateTime @map("created_at") @default(now()) @db.Timestamp(6)
  updatedAt      DateTime @map("updated_at") @default(now()) @db.Timestamp(6)
  reminders      TaskReminder[]
  assumptions    AiAssumption[]
  @@index([userId, dueDate])
  @@map("tasks")
}
model TaskReminder {
  id               String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  taskId           String @map("task_id") @db.Uuid
  task             Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  reminderAt       DateTime @map("reminder_at") @db.Timestamp(6)
  notificationType NotificationType @default(IN_APP) @map("notification_type")
  status           ReminderStatus @default(PENDING)
  sentAt           DateTime? @map("sent_at") @db.Timestamp(6)
  failedAt         DateTime? @map("failed_at") @db.Timestamp(6)
  createdAt        DateTime @map("created_at") @default(now()) @db.Timestamp(6)
  updatedAt        DateTime @map("updated_at") @default(now()) @db.Timestamp(6)
  @@map("task_reminders")
}
model AiInteraction {
  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String @map("user_id") @db.Uuid
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId      String? @map("task_id") @db.Uuid
  interactionType AiInteractionType @map("interaction_type")
  model       String? @db.VarChar(100)
  inputText   String? @map("input_text") @db.Text
  responseText String? @map("response_text") @db.Text
  latencyMs   Int?    @map("latency_ms")
  success     Boolean @default(true)
  errorCode   String? @map("error_code") @db.VarChar(100)
  errorMessage String? @map("error_message") @db.Text
  createdAt   DateTime @map("created_at") @default(now())
  @@map("ai_interactions")
}
model TaskRecommendation {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String @map("user_id") @db.Uuid
  user      User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId    String @map("task_id") @db.Uuid
  recommendationOrder Int @map("recommendation_order")
  reason    String? @db.Text
  generatedBy String? @map("generated_by") @db.VarChar(100)
  createdAt DateTime @map("created_at") @default(now())
  @@map("task_recommendations")
}
model AiAction {
  id           String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String @map("user_id") @db.Uuid
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  taskId       String? @map("task_id") @db.Uuid
  actionType   AiActionType @map("action_type")
  status       AiActionStatus @default(PENDING)
  requestText  String? @map("request_text") @db.Text
  actionPayload Json?  @map("action_payload")
  resultMessage String? @map("result_message") @db.Text
  errorMessage String? @map("error_message") @db.Text
  confirmedAt  DateTime? @map("confirmed_at") @db.Timestamp(6)
  completedAt  DateTime? @map("completed_at") @db.Timestamp(6)
  createdAt    DateTime @map("created_at") @default(now())
  updatedAt    DateTime @map("updated_at") @default(now())
  @@map("ai_actions")
}
model AiAssumption {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  taskId         String @map("task_id") @db.Uuid
  task           Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  fieldName      String @map("field_name") @db.VarChar(100)
  assumptionText String @map("assumption_text") @db.Text
  confidence     Decimal? @db.Decimal(5, 4)
  createdAt      DateTime @map("created_at") @default(now())
  @@map("ai_assumptions")
}
model NotificationSetting {
  id                     String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                 String @unique @map("user_id") @db.Uuid
  user                   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  enabled                Boolean @default(false)
  defaultReminderMinutes Int @default(5) @map("default_reminder_minutes")
  createdAt              DateTime @map("created_at") @default(now())
  updatedAt              DateTime @map("updated_at") @default(now())
  @@map("notification_settings")
}
model NotificationSubscription {
  id               String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId           String @map("user_id") @db.Uuid
  user             User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  notificationType NotificationType @map("notification_type")
  endpoint         String? @db.Text
  subscriptionData Json? @map("subscription_data")
  active           Boolean @default(true)
  createdAt        DateTime @map("created_at") @default(now())
  updatedAt        DateTime @map("updated_at") @default(now())
  @@map("notification_subscriptions")
}
```

- [ ] **Step 3: Tulis api/lib/prisma.js + api/lib/auth.js**

```js
// api/lib/prisma.js
import { PrismaClient } from '@prisma/client';
const prisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;
export default prisma;
```

```js
// api/lib/auth.js
export function wajibAuth(req, res, next) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'butuh login' });
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    const uid = payload.sub;
    if (!uid) return res.status(401).json({ error: 'token invalid' });
    req.userId = uid;
    return next();
  } catch {
    return res.status(401).json({ error: 'token invalid' });
  }
}
```

- [ ] **Step 4: Tulis test gagal**

```js
// api/lib/prisma.test.js
import { describe, it, expect } from 'vitest';
import prisma from './prisma.js';
import { wajibAuth } from './auth.js';
describe('prisma wiring', () => {
  it('prisma client tersedia', () => {
    expect(prisma.task.findMany).toBeTypeOf('function');
  });
  it('auth menolak tanpa token', () => {
    const req = { headers: {} };
    const res = { status: (c) => ({ json: (b) => ({ c, b }) }) };
    let next = false;
    wajibAuth(req, res, () => { next = true; });
    expect(next).toBe(false);
  });
});
```

- [ ] **Step 5: Jalankan + generate + tulis schema.sql reset**

Run: `npm --prefix api run test -- --run lib/prisma.test.js`
Expected: PASS.
Run: `npx --prefix api prisma generate`
Expected: sukses tanpa error.
Lalu tulis ulang `supabase/schema.sql` sebagai reset total (drop baru): 9 tabel sesuai dbdiagram + `alter table ... enable row level security` + policy `tasks_owner` dan sejenis per tabel user-scoped + index `tasks(user_id, due_date)`. Eksekusi manual di Supabase dashboard SQL Editor (catat di commit message bila RLS menolak baca silang = expected).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma api/lib/prisma.js api/lib/auth.js api/lib/prisma.test.js api/package.json api/.env.example supabase/schema.sql
git commit -m "feat: prisma schema PRD + reset DB + auth middleware"
```

---

### Task 2: Parser lokal rewrite (no-fake-time) + prioritas

**Files:**
- Modify: `client/src/lib/parserAturan.js`
- Test: `client/src/lib/parserAturan.test.js` (rewrite total)

**Interfaces:**
- Consumes: tidak ada.
- Produces: `parseParagraf(paragraf, now) => [{title, description, source_text, due_date: Date|null, due_time: string|null, time_precision, duration_minutes, assumptions[]}]`, `tentukanUrgency(due, now) => 'URGENT'|'NORMAL'|'LOW'`, `saranPriority(nama) => {priority, source, reason}`, `saranUrutan(tasks)`.

- [ ] **Step 1: Tulis test gagal (kontrak PRD)**

```js
// client/src/lib/parserAturan.test.js
import { describe, it, expect } from 'vitest';
import { parseParagraf, tentukanUrgency, saranPriority } from './parserAturan.js';
const now = new Date('2026-10-07T08:00:00+07:00');
describe('no-fake-time', () => {
  it('tanpa jam -> due_time null UNSPECIFIED', () => {
    const r = parseParagraf('Besok beli sepatu', now);
    expect(r).toHaveLength(1);
    expect(r[0].title).toMatch(/sepatu/i);
    expect(r[0].due_time).toBeNull();
    expect(r[0].time_precision).toBe('UNSPECIFIED');
  });
  it('jam eksplisit -> EXACT', () => {
    const r = parseParagraf('Besok jam 4 sore beli sepatu', now);
    expect(r[0].due_time).toBe('16:00');
    expect(r[0].time_precision).toBe('EXACT');
  });
  it('setengah 4 sore -> 15:30', () => {
    const r = parseParagraf('Olahraga setengah 4 sore', now);
    expect(r[0].due_time).toBe('15:30');
  });
  it('jam lewat hari ini -> besok', () => {
    const r = parseParagraf('Sarapan jam 6', new Date('2026-10-07T08:00:00+07:00'));
    expect(r[0].due_date.getDate()).toBe(8);
  });
  it('satu input tiga aktivitas -> tiga task', () => {
    const r = parseParagraf('Besok jam 8 kuliah, siangnya beli sepatu, jam 7 malam kerjakan tugas', now);
    expect(r).toHaveLength(3);
  });
});
describe('urgency/priority', () => {
  it('urgency dari jarak', () => {
    expect(tentukanUrgency(new Date(now.getTime() + 3600e3), now)).toBe('URGENT');
    expect(tentukanUrgency(new Date(now.getTime() + 5 * 3600e3), now)).toBe('NORMAL');
    expect(tentukanUrgency(new Date(now.getTime() + 5 * 864e5), now)).toBe('LOW');
  });
  it('priority keyword -> HIGH via AI', () => {
    expect(saranPriority('Besok kumpulin skripsi deadline').priority).toBe('HIGH');
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix client run test -- --run src/lib/parserAturan.test.js`
Expected: FAIL (kontrak lama `nama/tenggat` tidak cocok).

- [ ] **Step 3: Implementasi minimal (rewrite penuh parserAturan.js)**

Fungsi: `offsetHari` (hari ini/besok/lusa/nama hari/weekend), `parseJam` (jam|pukul H[:.]M + penanda sore/malam/siang/pagi, setengah H, N menit/jam lagi, nanti sore/malam->PERIOD), tanpa jam -> null+UNSPECIFIED, title bersih (buang penanda waktu), source_text utuh, assumption bila tanggal tak disebut / period, urgency + priority sesuai Global Constraints.

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npm --prefix client run test -- --run src/lib/parserAturan.test.js`
Expected: PASS semua.

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/parserAturan.js client/src/lib/parserAturan.test.js
git commit -m "feat: parser no-fake-time + urgency/priority PRD"
```

---

### Task 3: Backend tasks CRUD + lifecycle + validasi

**Files:**
- Create: `api/lib/validasi.js`, `api/lib/prioritas.js`, `api/routes/tasks.js`
- Modify: `api/app.js`
- Test: `api/routes/tasks.test.js`

**Interfaces:**
- Consumes: `prisma` (Task 1), `tentukanUrgency` logic (mirror Task 2 di server).
- Produces: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete|cancel|reopen`, `POST /api/tasks/sweep` (reminder idempoten).

- [ ] **Step 1: Tulis test gagal**

```js
// api/routes/tasks.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
describe('tasks lifecycle', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/tasks');
    expect(r.status).toBe(401);
  });
  it('buat tanpa title -> 400', async () => {
    const r = await request(app).post('/api/tasks').set('Authorization', 'Bearer x.y.z').send({ title: '  ' });
    expect([400, 401]).toContain(r.status);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix api run test -- --run routes/tasks.test.js`
Expected: FAIL `Cannot find module './tasks.js'` / 404.

- [ ] **Step 3: Implementasi minimal**

`api/lib/validasi.js`: Zod `taskBuat` (title 1-255, due_date/due_time nullable, time_precision enum, urgency/priority enum), `taskUbah` parsial, `chatMasuk`, `settings`.
`api/lib/prioritas.js`: `tentukanUrgency(dueISO, now)` + `saranPriority(title)` (keyword deadline/klien/skripsi/penting/mendesak/darurat -> HIGH/AI).
`api/routes/tasks.js`: semua route pakai `wajibAuth` + `prisma.task.*` dengan `where:{id, userId:req.userId, deletedAt:null}`; complete idempoten (sudah COMPLETED -> 200 sama); cancel simpan history; completed tak bisa PATCH tanpa reopen; `POST /sweep` buat `task_reminders` PENDING bila `due_time!=null` dan `reminder_at<=now`, tandai SENT sekali.
`api/app.js`: `app.use('/api/tasks', wajibAuth, tasksRouter)` + mount history/notifications (Task 4 siapkan stub bila belum ada -> kembalikan 501 agar test eksplisit).

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npm --prefix api run test -- --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add api/lib/validasi.js api/lib/prioritas.js api/routes/tasks.js api/routes/tasks.test.js api/app.js
git commit -m "feat: tasks CRUD + lifecycle + validasi"
```

---

### Task 4: AI parse/chat + history + notifications

**Files:**
- Modify: `api/lib/llmGratis.js`, `api/lib/normalisasi.js`, `api/routes/ai.js`
- Create: `api/routes/history.js`, `api/routes/notifications.js`
- Test: `api/routes/ai.test.js` (rewrite), `api/routes/history.test.js`

**Interfaces:**
- Consumes: `prisma`, `validasi`, `prioritas` (Task 3).
- Produces: `POST /api/ai/parse` kontrak PRD, `POST /api/ai/chat` read-only, `GET /api/history`, `GET/PATCH /api/notifications/settings`.

- [ ] **Step 1: Tulis test gagal**

```js
// api/routes/history.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
describe('history', () => {
  it('tanpa token -> 401', async () => {
    const r = await request(app).get('/api/history');
    expect([401, 404]).toContain(r.status);
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix api run test -- --run routes/history.test.js`
Expected: FAIL / 404.

- [ ] **Step 3: Implementasi minimal**

`llmGratis.js`: system prompt baru "Jangan mengarang jam; tanpa jam -> due_time null time_precision UNSPECIFIED; kembalikan JSON {tasks:[{title,description,due_date,due_time,time_precision,duration_minutes,urgency,priority,assumptions[]}]}, pisahkan aktivitas, title bersih".
`normalisasi.js`: `normalisasiTugas(arr, nowISO)` filter title non-kosong, potong 255, validasi tanggal, `due_time` regex `^([01]\d|2[0-3]):[0-5]\d$` atau null, precision enum, hitung urgency/priority server-side (backend memastikan, AI hanya suggest).
`routes/ai.js`: `POST /parse` (auth, panggil LLM, gagal -> `{sumber:'lokal', tasks:[]}`, sukses -> validasi + log `ai_interactions`), `POST /chat` (auth, hanya tools read: query tasks/schedule/overdue/summary via prisma, tolak kata kerja ubah/hapus dengan pesan preview).
`routes/history.js`: agregasi `total/completed/overdue/cancelled/completion_rate/urgent/byDay`.
`routes/notifications.js`: get-or-create settings default 5 mnt + patch enabled/minutes + subscribe upsert.

- [ ] **Step 4: Jalankan, pastikan lolos**

Run: `npm --prefix api run test -- --run`
Expected: PASS (tanpa AI_KEY jalur lokal).

- [ ] **Step 5: Commit**

```bash
git add api/lib/llmGratis.js api/lib/normalisasi.js api/routes/ai.js api/routes/history.js api/routes/notifications.js api/routes/ai.test.js api/routes/history.test.js
git commit -m "feat: AI parse/chat read-only + history + notifications"
```

---

### Task 5: Frontend preview + history + assistant + JWT

**Files:**
- Create: `client/src/components/Preview.jsx`, `History.jsx`, `AssistantBox.jsx`
- Modify: `client/src/lib/api.js`, `client/src/App.jsx`, `client/src/styles.css`
- Test: `client/src/lib/api.test.js` (update), `client/e2e/smoke.spec.js` (tambah preview path)

**Interfaces:**
- Consumes: kontrak Task 2-4.
- Produces: alur capture->preview->confirm tersimpan via API; history bulanan; assistant read-only.

- [ ] **Step 1: Tulis test gagal**

```js
// client/src/lib/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { mintaParse } from './api.js';
describe('mintaParse JWT', () => {
  it('kirim Authorization bila ada token', async () => {
    let headers;
    vi.stubGlobal('fetch', (url, opt) => { headers = opt.headers; return Promise.resolve({ ok: true, json: () => Promise.resolve({ sumber: 'lokal', tasks: [] }) }); });
    vi.stubGlobal('localStorage', { getItem: () => 'tok.test.sig' });
    await mintaParse('halo');
    expect(headers.Authorization).toMatch(/Bearer/);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm --prefix client run test -- --run src/lib/api.test.js`
Expected: FAIL (header belum dikirim).

- [ ] **Step 3: Implementasi minimal**

`api.js`: `token()` dari `supabase.auth.getSession()` (fallback localStorage `taskman:token`), semua fetch sertakan `Authorization: Bearer`, timeout 8000, throw agar caller fallback lokal.
`Preview.jsx`: tabel kandidat (title/date/time/assumption/priority+alasan) + Confirm/Edit/Cancel per baris.
`History.jsx`: fetch `/api/history/:y/:m`, tampil total/selesai/overdue/rate.
`AssistantBox.jsx`: input tanya -> `POST /ai/chat`, render jawaban + alasan, tanpa tombol mutasi.
`App.jsx`: state `preview[]` (hasil parse belum disimpan), `susun()` -> parse (AI lalu lokal) -> set preview (bukan langsung simpan); `konfirmasi(task)` -> `POST /tasks`; hapus-otomatis + Urung 8 dtk tetap; tamu localStorage format baru `{title,due_date,due_time,...}`; login migrasi batch via API.
`smoke.spec.js`: tambah langkah preview muncul -> confirm -> history bertambah.

- [ ] **Step 4: Verifikasi**

Run: `npm --prefix client run test -- --run`
Expected: PASS. Manual: tanpa key AI tetap jalan mode lokal + preview tampil "Jam belum ditentukan".

- [ ] **Step 5: Commit**

```bash
git add client/src/lib/api.js client/src/lib/api.test.js client/src/components/Preview.jsx client/src/components/History.jsx client/src/components/AssistantBox.jsx client/src/App.jsx client/src/styles.css client/e2e/smoke.spec.js
git commit -m "feat: preview-confirm + history + assistant read-only"
```

---

### Task 6: Verifikasi rilis P0

**Files:** tidak ada kode baru; verifikasi + `client/e2e/eval-prd.spec.js` (dataset PRD §70).

- [ ] **Step 1: Tulis eval gagal**

```js
// client/e2e/eval-prd.spec.js (vitest dataset, bukan browser)
import { describe, it, expect } from 'vitest';
import { parseParagraf } from '../src/lib/parserAturan.js';
const S = ['besok jam 4 beli sepatu', 'jam 1 siang meeting', 'setengah 4 sore olahraga', 'nanti malam kerjain laporan', 'besok deadline tugas', 'senin depan ketemu dosen'];
describe('eval PRD', () => {
  it('semua sample menghasilkan >=1 task tanpa fake-time', () => {
    for (const s of S) {
      const r = parseParagraf(s, new Date('2026-10-07T08:00:00+07:00'));
      expect(r.length).toBeGreaterThan(0);
      for (const t of r) {
        if (t.time_precision === 'UNSPECIFIED') expect(t.due_time).toBeNull();
      }
    }
  });
});
```

- [ ] **Step 2: Jalankan full suite**

Run: `npm run test:all`
Expected: PASS semua (client + api).

- [ ] **Step 3: Checklist dashboard sekali**

(1) SQL reset dijalankan di Supabase kosong tanpa error; (2) Auth redirect terdaftar (prod + localhost:5173); (3) env Vercel terisi (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `AI_PROVIDER`, `AI_KEY`, `AI_MODEL`, `DATABASE_URL`, `DIRECT_URL`); (4) `npx --prefix api prisma db push` sukses ke DB reset; (5) Playwright smoke + eval PASS.

- [ ] **Step 4: Commit**

```bash
git add client/e2e/eval-prd.spec.js
git commit -m "test: eval dataset PRD + verifikasi rilis P0"
```

---

## Self-Review

- **Spec coverage:** §1 -> Task 1+3 (Prisma, RLS, auth). §2 -> Task 2+4 (no-fake-time parser + LLM prompt + normalisasi). §3 urgensi/priority -> Task 2+3 (prioritas.js dua sisi). §4 API/history/notif -> Task 3+4. §5 frontend preview/history/assistant -> Task 5. §6 testing/eval -> Task 2-6. Non-tujuan (chat mutation/kolaborasi/Gantt/kalender-push) tidak ada tasknya — benar.
- **Placeholder scan:** semua langkah punya perintah + kode aktual + ekspektasi PASS/FAIL; tidak ada TBD/TODO.
- **Type consistency:** `due_date` Date|null + `due_time` 'HH:MM'|null di client, ISO/date+time di wire, `@db.Date/@db.Time` di Prisma; `urgency URGENT/NORMAL/LOW`, `priority HIGH/MEDIUM/LOW`, `status PENDING/COMPLETED/CANCELLED` sama di SQL, Prisma, Zod, UI.
