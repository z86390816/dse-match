import { useMemo, useState } from 'react';

const TIER_INFO = {
  safe: { label: '穩陣', cls: 'safe', desc: '你的分數 ≥ 收生中位數' },
  competitive: { label: '有機會', cls: 'competitive', desc: '介乎下四分位數與中位數之間' },
  reach: { label: '衝刺', cls: 'reach', desc: '略低於下四分位數，可博一博' },
  below: { label: '機會偏低', cls: 'below', desc: '低於收生分數' },
  unqualified: { label: '未符要求', cls: 'unqualified', desc: '未達必修門檻' },
  reference: { label: '僅供參考', cls: 'below', desc: '此校計分方式不同，未能精確比對' },
};
const TIER_ORDER = ['safe', 'competitive', 'reach', 'below', 'unqualified', 'reference'];

export default function ResultList({ results }) {
  const [uniFilter, setUniFilter] = useState('all');
  const [hideOutOfReach, setHideOutOfReach] = useState(false);

  const unis = useMemo(() => {
    const m = new Map();
    (results || []).forEach((r) => m.set(r.universityShort, (m.get(r.universityShort) || 0) + 1));
    return [...m.entries()];
  }, [results]);

  const tierCounts = useMemo(() => {
    const c = {};
    (results || []).forEach((r) => { c[r.tier] = (c[r.tier] || 0) + 1; });
    return c;
  }, [results]);

  if (!results) return <div className="empty">填好成績後按「開始比對」，結果會顯示在這裡。</div>;
  if (results.length === 0) return <div className="empty">沒有符合條件的專業，試試調整興趣或取消篩選。</div>;

  let shown = results;
  if (uniFilter !== 'all') shown = shown.filter((r) => r.universityShort === uniFilter);
  if (hideOutOfReach) shown = shown.filter((r) => ['safe', 'competitive', 'reach'].includes(r.tier));

  return (
    <div className="results">
      <h3>比對結果（{results.length} 個專業）</h3>

      {/* tier 統計 */}
      <div className="tier-summary">
        {TIER_ORDER.filter((t) => tierCounts[t]).map((t) => (
          <span key={t} className={`tier-pill ${TIER_INFO[t].cls}`}>
            {TIER_INFO[t].label} {tierCounts[t]}
          </span>
        ))}
      </div>

      {/* 院校篩選 */}
      <div className="uni-filter">
        <button className={`chip ${uniFilter === 'all' ? 'active' : ''}`} onClick={() => setUniFilter('all')}>全部</button>
        {unis.map(([u, n]) => (
          <button key={u} className={`chip ${uniFilter === u ? 'active' : ''}`} onClick={() => setUniFilter(u)}>{u} ({n})</button>
        ))}
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={hideOutOfReach} onChange={(e) => setHideOutOfReach(e.target.checked)} />
        只看有機會入到的（穩陣／有機會／衝刺）
      </label>

      <div className="result-count">顯示 {shown.length} 個</div>

      {shown.map((r) => {
        const t = TIER_INFO[r.tier] || TIER_INFO.below;
        return (
          <div className={`card tier-${t.cls}`} key={r.programmeId}>
            <div className="card-head">
              <div>
                <span className="uni">{r.universityShort}</span>
                <span className="pname">{r.name}</span>
                <span className="code">{r.jupasCode}</span>
              </div>
              <span className={`badge ${t.cls}`}>{t.label}</span>
            </div>

            <div className="scores">
              {r.scoreComparable !== false && (
                <div className="score-box mine">
                  <span className="num">{r.yourScore}</span>
                  <span className="cap">你的分數</span>
                </div>
              )}
              <div className="score-box">
                <span className="num">{r.admission?.median ?? '—'}</span>
                <span className="cap">收生中位數</span>
              </div>
              <div className="score-box">
                <span className="num">{r.admission?.lowerQuartile ?? '—'}</span>
                <span className="cap">下四分位數</span>
              </div>
            </div>

            {!r.requirementOk && r.scoreComparable !== false && (
              <div className="req-warn">⚠️ 未符要求：{r.requirementReasons.join('；')}</div>
            )}
            {r.scaleNote && <div className="req-warn">ℹ️ {r.scaleNote}</div>}

            <div className="meta">
              <span>{t.desc}</span>
              {r.scoreComparable !== false && r.gapToMedian != null && r.requirementOk && (
                <span className={r.gapToMedian >= 0 ? 'pos' : 'neg'}>
                  距中位數 {r.gapToMedian >= 0 ? '+' : ''}{r.gapToMedian}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
