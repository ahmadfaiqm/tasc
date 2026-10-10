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
