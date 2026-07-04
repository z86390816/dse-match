import { useMemo, useState } from 'react';

// 排序成排行榜資料
function rank(obj, nameMap) {
  const arr = Object.entries(obj || {})
    .map(([id, n]) => ({ id, n: Number(n) || 0, name: nameMap[id] || id }))
    .sort((a, b) => b.n - a.n);
  const max = arr.length ? arr[0].n : 1;
  const total = arr.reduce((s, x) => s + x.n, 0);
  return { arr, max, total };
}

function Bars({ title, data, nameMap, limit = 20 }) {
  const { arr, max, total } = useMemo(() => rank(data, nameMap), [data, nameMap]);
  if (!arr.length) return <div className="adm-card"><h3>{title}</h3><p className="adm-muted">暫無點擊數據。</p></div>;
  return (
    <div className="adm-card">
      <h3>{title} <span className="adm-muted">· 共 {total} 次點擊</span></h3>
      <div className="adm-bars">
        {arr.slice(0, limit).map((r, i) => (
          <div className="adm-bar-row" key={r.id}>
            <span className="adm-rank">{i + 1}</span>
            <span className="adm-bar-name" title={r.id}>{r.name}</span>
            <span className="adm-bar-track"><span className="adm-bar-fill" style={{ width: `${max ? (r.n / max) * 100 : 0}%` }} /></span>
            <span className="adm-bar-num">{r.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 訪問統計卡：今日/總計 + 最近 14 日排列
function Visits({ pv, uv }) {
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  const days = useMemo(() => {
    const set = new Set([...Object.keys(pv || {}), ...Object.keys(uv || {})]);
    return [...set].sort().reverse().slice(0, 14);
  }, [pv, uv]);
  const totalPv = Object.values(pv || {}).reduce((s, n) => s + n, 0);
  const totalUv = Object.values(uv || {}).reduce((s, n) => s + n, 0);
  const maxPv = Math.max(1, ...days.map((d) => pv?.[d] || 0));
  return (
    <div className="adm-card">
      <h3>👥 訪問人數</h3>
      <div className="adm-visit-summary">
        <div><span className="adm-visit-num">{uv?.[today] || 0}</span><span className="adm-muted">今日訪客</span></div>
        <div><span className="adm-visit-num">{pv?.[today] || 0}</span><span className="adm-muted">今日訪問</span></div>
        <div><span className="adm-visit-num">{totalUv}</span><span className="adm-muted">總訪客</span></div>
        <div><span className="adm-visit-num">{totalPv}</span><span className="adm-muted">總訪問</span></div>
      </div>
      {days.length === 0 ? <p className="adm-muted">暫無訪問數據（新功能上線後開始累計）。</p> : (
        <div className="adm-bars">
          {days.map((d) => (
            <div className="adm-bar-row" key={d}>
              <span className="adm-bar-name" style={{ flex: '0 0 84px' }}>{d.slice(5)}{d === today ? ' ★' : ''}</span>
              <span className="adm-bar-track"><span className="adm-bar-fill" style={{ width: `${((pv?.[d] || 0) / maxPv) * 100}%` }} /></span>
              <span className="adm-bar-num">{uv?.[d] || 0} 客 / {pv?.[d] || 0} 次</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 國家代碼 → 🇭🇰 國旗 emoji
function flag(cc) {
  if (!/^[A-Z]{2}$/i.test(cc)) return '🌐';
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
const regionName = (() => {
  try { const dn = new Intl.DisplayNames(['zh-Hant'], { type: 'region' }); return (cc) => { try { return dn.of(cc) || cc; } catch { return cc; } }; }
  catch { return (cc) => cc; }
})();

// 訪客地區排行 + 最近訪客名單（IP／國家／城市）
function Geo({ country, log }) {
  const { arr, max, total } = useMemo(() => rank(country || {}, {}), [country]);
  return (
    <>
      <div className="adm-card">
        <h3>🌍 訪客地區 <span className="adm-muted">· 共 {total} 次</span></h3>
        {!arr.length ? <p className="adm-muted">暫無地區數據。</p> : (
          <div className="adm-bars">
            {arr.slice(0, 15).map((r, i) => (
              <div className="adm-bar-row" key={r.id}>
                <span className="adm-rank">{i + 1}</span>
                <span className="adm-bar-name">{flag(r.id)} {r.id === 'unknown' ? '未知' : regionName(r.id)}</span>
                <span className="adm-bar-track"><span className="adm-bar-fill" style={{ width: `${max ? (r.n / max) * 100 : 0}%` }} /></span>
                <span className="adm-bar-num">{r.n}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="adm-card">
        <h3>🧭 最近訪客 <span className="adm-muted">· 最新 {Math.min((log || []).length, 200)} 條</span></h3>
        {!(log || []).length ? <p className="adm-muted">暫無訪客記錄。</p> : (
          <div className="adm-visitor-table">
            <div className="adm-visitor-row adm-visitor-head">
              <span>時間</span><span>IP</span><span>地區</span><span></span>
            </div>
            {log.slice(0, 50).map((v, i) => (
              <div className="adm-visitor-row" key={i}>
                <span>{new Date(v.t).toLocaleString('zh-HK', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="adm-visitor-ip">{v.ip || '—'}</span>
                <span>{flag(v.country)} {v.country === 'unknown' ? '未知' : regionName(v.country)}{v.city ? ` · ${v.city}` : ''}</span>
                <span>{v.uv ? <span className="adm-visitor-new">新</span> : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminApp() {
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [discNames, setDiscNames] = useState({});
  const [progNames, setProgNames] = useState({});

  async function login(e) {
    e?.preventDefault?.();
    setLoading(true); setError('');
    try {
      const r = await fetch('/api/admin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (r.status === 401) { setError('密碼錯誤'); setLoading(false); return; }
      if (r.status === 503) { setError('尚未設定：請先在 Vercel 加入 Upstash 儲存並設定 ADMIN_PASSWORD 環境變數。'); setLoading(false); return; }
      if (!r.ok) { setError(`載入失敗（${r.status}）`); setLoading(false); return; }
      const j = await r.json();
      setData(j);
      // 載入名稱對映（學科、專業）
      const [disc, prog] = await Promise.all([
        import('../data/disciplines.json').then((m) => m.default).catch(() => ({})),
        import('../data/programmes.json').then((m) => m.default).catch(() => ({ programmes: [] })),
      ]);
      const dn = {}; Object.entries(disc).forEach(([id, v]) => { dn[id] = v.nameZh || v.nameEn || id; });
      const pn = {}; (prog.programmes || []).forEach((p) => { pn[p.jupasCode] = `${p.jupasCode} ${p.nameZh || p.name}`; });
      setDiscNames(dn); setProgNames(pn);
    } catch { setError('網絡錯誤，請重試。'); }
    setLoading(false);
  }

  if (!data) {
    return (
      <div className="adm-login">
        <form className="adm-login-box" onSubmit={login}>
          <h2>🔐 JUPAS Calculator 後台</h2>
          <p className="adm-muted">輸入管理密碼登入</p>
          <input
            type="password" className="adm-input" value={password} autoFocus
            placeholder="管理密碼" onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="adm-err">{error}</p>}
          <button className="adm-btn" type="submit" disabled={loading}>{loading ? '登入中…' : '登入'}</button>
        </form>
      </div>
    );
  }

  const reports = data.reports || [];
  return (
    <div className="adm-wrap">
      <header className="adm-header">
        <h1>📊 JUPAS Calculator 後台</h1>
        <button className="adm-btn small" onClick={() => login()} disabled={loading}>{loading ? '刷新中…' : '↻ 刷新'}</button>
      </header>

      <Visits pv={data.visitsPv} uv={data.visitsUv} />

      <div className="adm-grid">
        <Geo country={data.visitsCountry} log={data.visitorLog} />
      </div>

      <div className="adm-grid">
        <Bars title="🏆 最多人點擊的學科" data={data.clicksDiscipline} nameMap={discNames} limit={30} />
        <Bars title="🔥 最多人點擊的專業" data={data.clicksProgramme} nameMap={progNames} limit={30} />
      </div>

      <div className="adm-card">
        <h3>📮 用戶上報（{reports.length}）</h3>
        {reports.length === 0 ? (
          <p className="adm-muted">暫無上報。</p>
        ) : (
          <div className="adm-reports">
            {reports.map((r, i) => (
              <div className="adm-report" key={i}>
                <div className="adm-report-top">
                  <span className="adm-report-time">{new Date(r.t).toLocaleString('zh-HK')}</span>
                  {r.programme && <span className="adm-report-prog">🎯 {r.programme}</span>}
                  {r.lang && <span className="adm-report-lang">{r.lang}</span>}
                </div>
                <div className="adm-report-msg">{r.message}</div>
                {r.contact && <div className="adm-report-contact">📇 {r.contact}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
