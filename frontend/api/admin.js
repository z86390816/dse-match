// 後台資料：密碼驗證後回傳上報列表 + 學科/專業點擊統計。
// 密碼存於 Vercel 環境變數 ADMIN_PASSWORD（我看不到、也不寫在程式裡）。
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

// HGETALL 回傳 [field, val, field, val, ...] → 物件
function toObj(arr) {
  const o = {};
  if (Array.isArray(arr)) for (let i = 0; i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]) || 0;
  return o;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method-not-allowed' });
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(503).json({ error: 'admin-password-not-set' });
  const pw = (req.body && req.body.password) || '';
  if (pw !== expected) return res.status(401).json({ error: 'wrong-password' });
  try {
    const raw = await redis('LRANGE', 'reports', 0, -1);
    const reports = (raw || [])
      .map((s) => { try { return JSON.parse(s); } catch { return null; } })
      .filter(Boolean);
    const [disc, prog, pv, uv, country, log] = await Promise.all([
      redis('HGETALL', 'clicks:discipline'),
      redis('HGETALL', 'clicks:programme'),
      redis('HGETALL', 'visits:pv'),
      redis('HGETALL', 'visits:uv'),
      redis('HGETALL', 'visits:country'),
      redis('LRANGE', 'visits:log', 0, 199),
    ]);
    const visitorLog = (log || [])
      .map((s) => { try { return JSON.parse(s); } catch { return null; } })
      .filter(Boolean);
    return res.status(200).json({
      ok: true,
      reports,
      clicksDiscipline: toObj(disc),
      clicksProgramme: toObj(prog),
      visitsPv: toObj(pv),
      visitsUv: toObj(uv),
      visitsCountry: toObj(country),
      visitorLog,
    });
  } catch (e) {
    const code = e.message === 'storage-not-configured' ? 503 : 500;
    return res.status(code).json({ error: e.message });
  }
}
