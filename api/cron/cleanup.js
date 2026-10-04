export default async (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`)
    return res.status(401).json({ error: 'unauthorized' });
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return res.json({ dihapus: 0 });
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/tasks?tenggat=lt.${encodeURIComponent(new Date().toISOString())}`,
      {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          Prefer: 'return=representation',
        },
      },
    );
    if (!r.ok) throw new Error(`Supabase HTTP ${r.status}`);
    const rows = await r.json();
    return res.json({ dihapus: rows.length });
  } catch {
    return res.status(502).json({ dihapus: 0 });
  }
};
