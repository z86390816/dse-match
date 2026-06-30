import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.jsx';
import { api } from '../api';
import { DetailOverlay } from './ProgrammeDetail.jsx';

const TIER_ORDER = ['safe', 'competitive', 'reach', 'below', 'unqualified', 'reference'];
const TIER_CLS = { safe: 'safe', competitive: 'competitive', reach: 'reach', below: 'below', unqualified: 'unqualified', reference: 'below' };

const SCHEME_LABEL = {
  bonusTop: '5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1',
  standard: '5**=7, 5*=6, 5=5, 4=4, 3=3, 2=2, 1=1',
};
const schemeLabel = (s) => SCHEME_LABEL[s] || s;

export default function ResultList({ results }) {
  const { lang, t } = useLang();
  const uniName = (r) => (lang === 'zh' ? (r.universityShortZh || r.universityShort) : r.universityShort);
  const progName = (r) => (lang === 'zh' && r.nameZh ? r.nameZh : r.name);
  const [uniFilter, setUniFilter] = useState('all');
  const [hideOutOfReach, setHideOutOfReach] = useState(false);
  const [expanded, setExpanded] = useState(() => new Set());
  const [selProg, setSelProg] = useState(null);
  const [disciplines, setDisciplines] = useState(null);
  useEffect(() => { api.getDisciplines().then((d) => setDisciplines(d.disciplines)).catch(() => {}); }, []);
  const toggle = (id) => setExpanded((prev) => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  function methodLabel(r) {
    if (r.method === 'hku' && r.formula) {
      const f = r.formula;
      const fixed = (f.fixed || []).map((x) => `${x.weight}×${x.subject}`).join(' + ');
      return `${fixed} + Best ${f.bestN}${f.tailWeight ? ` + ${f.tailWeight}×${f.bestN + 1}th` : ''}`;
    }
    if (r.method === 'best6') return 'Best 6';
    return 'Best 5';
  }

  const unis = useMemo(() => {
    const m = new Map();
    (results || []).forEach((r) => {
      const e = m.get(r.universityShort) || { n: 0, zh: r.universityShortZh };
      e.n += 1;
      m.set(r.universityShort, e);
    });
    return [...m.entries()]; // [short, { n, zh }]
  }, [results]);

  const tierCounts = useMemo(() => {
    const c = {};
    (results || []).forEach((r) => { c[r.tier] = (c[r.tier] || 0) + 1; });
    return c;
  }, [results]);

  if (!results) return <div className="empty">{t('emptyPrompt')}</div>;
  if (results.length === 0) return <div className="empty">{t('emptyNoMatch')}</div>;

  let shown = results;
  if (uniFilter !== 'all') shown = shown.filter((r) => r.universityShort === uniFilter);
  if (hideOutOfReach) shown = shown.filter((r) => ['safe', 'competitive', 'reach'].includes(r.tier));

  return (
    <div className="results">
      <h3>{t('resultsTitle')}（{results.length} {t('programmesUnit')}）</h3>

      {/* tier 統計 */}
      <div className="tier-summary">
        {TIER_ORDER.filter((tk) => tierCounts[tk]).map((tk) => (
          <span key={tk} className={`tier-pill ${TIER_CLS[tk]}`}>
            {t.tier(tk).label} {tierCounts[tk]}
          </span>
        ))}
      </div>

      {/* 院校篩選 */}
      <div className="uni-filter">
        <button className={`chip ${uniFilter === 'all' ? 'active' : ''}`} onClick={() => setUniFilter('all')}>{t('filterAll')}</button>
        {unis.map(([u, info]) => (
          <button key={u} className={`chip ${uniFilter === u ? 'active' : ''}`} onClick={() => setUniFilter(u)}>
            {(lang === 'zh' ? (info.zh || u) : u)} ({info.n})
          </button>
        ))}
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={hideOutOfReach} onChange={(e) => setHideOutOfReach(e.target.checked)} />
        {t('hideOutOfReach')}
      </label>

      <div className="result-count">{t('showingN')} {shown.length}</div>

      {shown.map((r) => {
        const tier = t.tier(r.tier);
        const cls = TIER_CLS[r.tier] || 'below';
        return (
          <div className={`card tier-${cls}`} key={r.programmeId}>
            <div className="card-head card-head-click" onClick={() => setSelProg(r)}>
              <div>
                <span className="uni">{uniName(r)}</span>
                <span className="pname">{progName(r)}</span>
                <span className="code">{r.jupasCode}</span>
                <span className="detail-hint">›</span>
              </div>
              <span className={`badge ${cls}`}>{tier.label}</span>
            </div>

            <div className="scores">
              {r.scoreComparable !== false && (
                <div className="score-box mine">
                  <span className="num">{r.yourScore}</span>
                  <span className="cap">{t('yourScore')}</span>
                </div>
              )}
              {r.admission?.upperQuartile != null && (
                <div className="score-box">
                  <span className="num">{r.admission.upperQuartile}</span>
                  <span className="cap">{t('upperQuartile')}</span>
                </div>
              )}
              <div className="score-box">
                <span className="num">{r.admission?.median ?? '—'}</span>
                <span className="cap">{t('median')}</span>
              </div>
              <div className="score-box">
                <span className="num">{r.admission?.lowerQuartile ?? '—'}</span>
                <span className="cap">{t('lowerQuartile')}</span>
              </div>
            </div>

            {!r.requirementOk && r.scoreComparable !== false && (
              <div className="req-warn">⚠️ {r.requirementReasons.join('；')}</div>
            )}
            {r.scaleNote && <div className="req-warn">ℹ️ {r.scaleNote}</div>}

            <div className="meta">
              <span>{tier.desc}</span>
              {r.admitted2025 > 0 && (
                <span className="admit-chip">{t('admitted2025')} {r.admitted2025}</span>
              )}
              {r.scoreComparable !== false && r.gapToMedian != null && r.requirementOk && (
                <span className={r.gapToMedian >= 0 ? 'pos' : 'neg'}>
                  {t('distToMedian')} {r.gapToMedian >= 0 ? '+' : ''}{r.gapToMedian}
                </span>
              )}
            </div>
            {r.scoreComparable !== false && r.breakdown?.length > 0 && (
              <button className="calc-btn" onClick={() => toggle(r.programmeId)}>
                {expanded.has(r.programmeId) ? t('hideCalc') : t('viewCalc')}
              </button>
            )}

            {expanded.has(r.programmeId) && r.scoreComparable !== false && (
              <div className="calc-detail">
                <div className="calc-method">
                  {t('calcMethod')}：{methodLabel(r)}
                  {r.weightsStatus === 'unweighted-approx' && <span className="approx">{t('approxNote')}</span>}
                </div>
                <table className="calc-table">
                  <thead>
                    <tr><th>{t('colSubject')}</th><th>{t('colGrade')}</th><th>{t('colPoints')}</th><th>{t('colWeight')}</th><th>{t('colScore')}</th></tr>
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
                    <tr><td colSpan="4">{t('totalRow')}</td><td className="total">{r.yourScore}</td></tr>
                  </tfoot>
                </table>
                <div className="calc-note">{t('gradeTable')}：{schemeLabel(r.gradeScheme)}</div>
              </div>
            )}
          </div>
        );
      })}

      {selProg && (
        <DetailOverlay prog={selProg} year={2025} disciplines={disciplines} onClose={() => setSelProg(null)} />
      )}
    </div>
  );
}
