// api/lib/schema.test.js
// Penjaga kelas bug: field NON-NULL tanpa @default di Prisma menyebabkan
// prisma.<model>.create() gagal "Argument <field> is missing" walau kolom DB
// punya default. Bug nyata: User.createdAt/updatedAt tanpa @default(now())
// -> PATCH /api/profile selalu 500 -> baris users tak pernah ada -> POST /api/tasks
// melanggar FK tasks_user_id_fkey (P2003) -> client "Gagal menyimpan".
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const skema = readFileSync(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');

// Ambil isi tiap blok `model X { ... }`.
function blokModel(teks) {
  const hasil = [];
  const re = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m;
  while ((m = re.exec(teks))) hasil.push({ nama: m[1], isi: m[2] });
  return hasil;
}

describe('prisma/schema.prisma — field waktu wajib punya default', () => {
  const model = blokModel(skema);

  it('minimal satu model ditemukan (parser berfungsi)', () => {
    expect(model.length).toBeGreaterThan(0);
  });

  it('setiap field createdAt/updatedAt punya @default(now()) atau @updatedAt', () => {
    const pelanggar = [];
    for (const { nama, isi } of model) {
      for (const baris of isi.split('\n')) {
        const t = baris.trim();
        const m = /^(createdAt|updatedAt)\s+/.exec(t);
        if (!m) continue;
        if (/@default\(now\(\)\)|@updatedAt/.test(t)) continue;
        pelanggar.push(`${nama}.${m[1]}`);
      }
    }
    expect(pelanggar).toEqual([]);
  });
});
