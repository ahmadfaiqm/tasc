import express from 'express';

const router = express.Router();
router.post('/subscribe', (req, res) => res.json({ ok: true, tersimpan: false }));

export default router;
