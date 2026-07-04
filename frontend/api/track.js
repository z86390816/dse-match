// 記錄學科（discipline）與專業（jupasCode）被點擊次數 → Redis hash。
// 靜默失敗：追蹤失敗不可影響使用者體驗。
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

// 香港時區當日日期 YYYY-MM-DD
function hkDate() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });
  try {
    const b = req.body || {};
    const discipline = String(b.discipline || '').slice(0, 60);
    const jupasCode = String(b.jupasCode || '').slice(0, 20);
    if (discipline) await redis('HINCRBY', 'clicks:discipline', discipline, 1);
    if (jupasCode) await redis('HINCRBY', 'clicks:programme', jupasCode, 1);
    // 訪問統計：visit=每次進站（PV）；uv=今日首次到訪的訪客（由前端 localStorage 判斷）
    if (b.visit) {
      const d = hkDate();
      await redis('HINCRBY', 'visits:pv', d, 1);
      if (b.uv) await redis('HINCRBY', 'visits:uv', d, 1);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false }); // 靜默
  }
}
