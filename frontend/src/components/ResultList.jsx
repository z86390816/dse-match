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

const SCHEME_LABEL = {
  bonusTop: '5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1（2025 新制）',
  standard: '5**=7, 5*=6, 5=5, 4=4, 3=3, 2=2, 1=1',
};
const schemeLabel = (s) => SCHEME_LABEL[s] || s;

function methodLabel(r) {
  if (r.method === 'hku' && r.formula) {
    const f = r.formula;
    const fixed = (f.fixed || []).map((x) => `${x.weight}×${x.subject}`).join(' + ');
    return `${fixed} + 最佳 ${f.bestN} 科${f.tailWeight ? ` + ${f.tailWeight}×第 ${f.bestN + 1} 佳` : ''}`;
  }
  if (r.method === 'best6') return '最佳 6 科（加權後）';
  return '最佳 5 科（加權後）';
}

export default function ResultList({ results }) {
  const [uniFilter, setUniFilter] = useState('all');
  const [hideOutOfReach, setHideOutOfReach] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (id) => setExpanded((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

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
              {r.scoreComparable !== false && r.breakdown?.length > 0 && (
                <button className="calc-toggle" onClick={() => toggle(r.programmeId)}>
                  {expanded.has(r.programmeId) ? '▲ 收起計分' : '▼ 計分明細'}
                </button>
              )}
            </div>

            {expanded.has(r.programmeId) && r.scoreComparable !== false && (
              <div className="calc-detail">
                <div className="calc-method">
                  計法：{methodLabel(r)}
                  {r.weightsStatus === 'unweighted-approx' && <span className="approx">（加權近似，未完全還原）</span>}
                </div>
                <table className="calc-table">
                  <thead>
                    <tr><th>科目</th><th>等級</th><th>換分</th><th>加成</th><th>得分</th></tr>
                  </thead>
                  <tbody>
                    {r.breakdown.map((b, i) => (
                      <tr key={i}>
                        <td>{b.name}{b.role ? <span className="role"> {b.role}</span> : ''}</td>
                        <td>{b.grade}</td>
                        <td>{b.basePoints ?? '—'}</td>
                        <td className={b.weight !== 1 ? 'w-hi' : ''}>×{b.weight}</td>
                        <td>{b.weightedPoints}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan="4">總分</td><td className="total">{r.yourScore}</td></tr>
                  </tfoot>
                </table>
                <div className="calc-note">換分表：{schemeLabel(r.gradeScheme)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
