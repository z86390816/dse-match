// 使用者上報數據錯誤 → 存入 Redis list「reports」。
// 儲存用 Upstash Redis REST（免費）；env 未設定時回 503，前端會提示改用電郵。
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  if (!URL || !TOKEN) throw new Error('storage-not-configured');
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });
  try {
    const b = req.body || {};
    const message = String(b.message || '').trim().slice(0, 2000);
    if (!message) return res.status(400).json({ error: 'empty-message' });
    const entry = JSON.stringify({
      t: Date.now(),
      programme: String(b.programme || '').slice(0, 200),
      message,
      contact: String(b.contact || '').slice(0, 200),
      lang: String(b.lang || '').slice(0, 8),
    });
    await redis('LPUSH', 'reports', entry);
    await redis('LTRIM', 'reports', 0, 1999); // 只保留最近 2000 筆
    return res.status(200).json({ ok: true });
  } catch (e) {
    const code = e.message === 'storage-not-configured' ? 503 : 500;
    return res.status(code).json({ error: e.message });
  }
}
