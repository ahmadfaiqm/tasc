import express from 'express';
import cors from 'cors';
import ai from './routes/ai.js';
import push from './routes/push.js';
import cleanup from './cron/cleanup.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/ai', ai);
app.use('/api/push', push);
app.get('/api/cron/cleanup', cleanup);

export default app;
