// api/index.js — Vercel serverless entry (satu Express monolith).
// Vercel memetakan file ini ke URL /api; vercel.json me-rewrite /api/* -> /api
// agar semua route Express (/api/health, /api/tasks, ...) tertangani satu fungsi.
// app.js tetap diekspor terpisah agar supertest tidak terpengaruh.
import app from './app.js';

// Handler eksplisit (req, res) — kompatibel Node serverless runtime.
// Express app sendiri adalah fungsi (req, res, next), jadi delegasi langsung.
export default function handler(req, res) {
  return app(req, res);
}
