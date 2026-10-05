import { Router } from 'express';

// Placeholder Task 1: endpoint AI asli dibangun di Task 3.
// Mengembalikan 503 agar kontrak "belum tersedia" eksplisit.
const r = Router();
r.use((req, res) => res.status(503).json({ error: 'AI belum tersedia' }));
export default r;
