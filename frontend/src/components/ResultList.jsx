import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.jsx';
import { api } from '../api';
import { DetailOverlay } from './ProgrammeDetail.jsx';
import ReportModal from './ReportModal.jsx';

const TIER_ORDER = ['safe', 'competitive', 'reach', 'below', 'unqualified', 'reference'];
const TIER_CLS = { safe: 'safe', competitive: 'competitive', reach: 'reach', below: 'below', unqualified: 'unqualified', reference: 'below' };

// 「入到」＝穩陣／有機會／衝刺；其餘（機會偏低、未符要求）歸「入唔到」。
const ATTAINABLE_TIERS = ['safe', 'competitive', 'reach'];
const isAttainable = (r) => ATTAINABLE_TIERS.includes(r.tier);

// 一次先渲染多少張卡；「入唔到」那組動輒 200+ 個專業，全部一次過畫會拖慢手機。
const PAGE = 30;

const SCHEME_LABEL = {
  bonusTop: '5**=8.5, 5*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1',
  standard: '5**=7, 5*=6, 5=5, 4=4, 3=3, 2=2, 1=1',
};
const schemeLabel = (s) => SCHEME_LABEL[s] || s;

// 相對差距顯示成百分比。差距不足 1% 時保留一位小數，
// 否則 -0.07 分會被四捨五入成「0%」，看起來像剛好踩線。
function fmtGapPct(ratio) {
  const pct = ratio * 100;
  if (pct === 0) return '0%';
  const n = Math.abs(pct) < 1 ? pct.toFixed(1) : String(Math.round(pct));
  return `${pct > 0 ? '+' : ''}${n}%`;
}

export default function ResultList({ results }) {
  const { lang, t } = useLang();
  const uniName = (r) => (lang === 'en' ? r.universityShort : t.s(r.universityShortZh || r.universityShort));
  const progName = (r) => (lang !== 'en' && r.nameZh ? t.s(r.nameZh) : r.name);
  const [uniFilter, setUniFilter] = useState('all');
  // 預設「全部」：入到同入唔到都要睇得到，入唔到嗰啲按差距由細到大排喺後面。
  const [scope, setScope] = useState('all'); // 'all' | 'attainable' | 'outOfReach'
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const [selProg, setSelProg] = useState(null);
  const [reportFor, setReportFor] = useState(null); // 計分明細內「計分有誤」上報
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

  const kw = keyword.trim();

  // 三道獨立篩選：關鍵字 → 範圍（入到／入唔到）→ 院校。
  // 兩組 chip 的數字都不把自己那道算進去，數字才會跟按下去之後見到的一致。
  const afterKw = useMemo(() => {
    const l = results || [];
    if (!kw) return l;
    const k = kw.toLowerCase();
    return l.filter((r) =>
      (r.name || '').toLowerCase().includes(k) ||
      (r.nameZh || '').includes(kw) ||
      (r.jupasCode || '').toLowerCase().includes(k) ||
      (r.universityShort || '').toLowerCase().includes(k) ||
      (r.universityShortZh || '').includes(kw) ||
      (r.universityName || '').includes(kw));
  }, [results, kw]);

  const applyScope = (list, sc) => {
    if (sc === 'attainable') return list.filter(isAttainable);
    if (sc === 'outOfReach') return list.filter((r) => !isAttainable(r));
    return list;
  };
  const applyUni = (list, u) => (u === 'all' ? list : list.filter((r) => r.universityShort === u));

  const scopeCounts = useMemo(() => {
    const l = applyUni(afterKw, uniFilter);
    const ok = l.filter(isAttainable).length;
    return { all: l.length, attainable: ok, outOfReach: l.length - ok };
  }, [afterKw, uniFilter]);

  const unis = useMemo(() => {
    const m = new Map();
    applyScope(afterKw, scope).forEach((r) => {
      const e = m.get(r.universityShort) || { n: 0, zh: r.universityShortZh };
      e.n += 1;
      m.set(r.universityShort, e);
    });
    return [...m.entries()]; // [short, { n, zh }]
  }, [afterKw, scope]);

  const shown = useMemo(() => applyUni(applyScope(afterKw, scope), uniFilter), [afterKw, scope, uniFilter]);

  // matchAll 已按「等級 → 相對差距」排好，所以拆組後兩邊都保持差距由細到大。
  const groups = useMemo(() => ({
    attainable: shown.filter(isAttainable),
    outOfReach: shown.filter((r) => !isAttainable(r)),
  }), [shown]);

  const tierCounts = useMemo(() => {
    const c = {};
    (results || []).forEach((r) => { c[r.tier] = (c[r.tier] || 0) + 1; });
    return c;
  }, [results]);

  // 換篩選就收回「載入更多」，否則切過去會直接見到上一組展開後的長度。
  const [limits, setLimits] = useState({ attainable: PAGE, outOfReach: PAGE });
  useEffect(() => { setLimits({ attainable: PAGE, outOfReach: PAGE }); }, [kw, scope, uniFilter, results]);

  if (!results) return <div className="empty">{t('emptyPrompt')}</div>;
  if (results.length === 0) return <div className="empty">{t('emptyNoMatch')}</div>;

  function renderCard(r) {
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
          {r.scoreComparable !== false && r.gapToMedian != null && (
            <span className={r.gapToMedian >= 0 ? 'pos' : 'neg'}>
              {t('distToMedian')} {r.gapToMedian >= 0 ? '+' : ''}{r.gapToMedian}
              {r.gapRatio != null && ` (${fmtGapPct(r.gapRatio)})`}
            </span>
          )}
        </div>
        <div className="card-actions">
          <button className="calc-btn detail-btn" onClick={() => setSelProg(r)}>
            {t('detailBtn')}
          </button>
          {r.scoreComparable !== false && r.breakdown?.length > 0 && (
            <button className="calc-btn" onClick={() => toggle(r.programmeId)}>
              {expanded.has(r.programmeId) ? t('hideCalc') : t('viewCalc')}
            </button>
          )}
        </div>

        {expanded.has(r.programmeId) && r.scoreComparable !== false && (
          <div className="calc-detail">
            <div className="calc-method">
              {t('calcMethod')}{t.sep}{methodLabel(r)}
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
            <div className="calc-note">{t('gradeTable')}{t.sep}{schemeLabel(r.gradeScheme)}</div>
            <button className="report-link-btn" onClick={() => setReportFor(r)}>{t('reportOnCalc')}</button>
          </div>
        )}
      </div>
    );
  }

  function renderGroup(key) {
    const list = groups[key];
    const cls = key === 'attainable' ? 'attainable' : 'out-of-reach';
    // 只選了一邊時不必再標題分段——chip 已經講清楚在看哪一組。
    if (scope !== 'all' && list.length === 0) return null;
    const limit = limits[key];
    return (
      <section className={`result-group ${cls}`} key={key}>
        {scope === 'all' && (
          <h4 className="group-head">
            {t(key === 'attainable' ? 'sectionAttainable' : 'sectionOutOfReach')}
            <span className="group-count">{list.length}</span>
          </h4>
        )}
        {list.length === 0
          ? <div className="group-empty">{t(key === 'attainable' ? 'sectionAttainableEmpty' : 'sectionOutOfReachEmpty')}</div>
          : list.slice(0, limit).map(renderCard)}
        {list.length > limit && (
          <button
            className="load-more"
            onClick={() => setLimits((p) => ({ ...p, [key]: p[key] + PAGE }))}
          >
            {t('loadMore')} ({list.length - limit})
          </button>
        )}
      </section>
    );
  }

  return (
    <div className="results">
      <h3>{t('resultsTitle')}{lang === 'en' ? ` (${results.length} ${t('programmesUnit')})` : `（${results.length} ${t('programmesUnit')}）`}</h3>

      <input className="search result-search" placeholder={t('searchResultPlaceholder')}
        value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      {kw && scope === 'all' && <div className="search-hint">{t('searchAllHint')}</div>}

      {/* tier 統計：六級全列，讓人一眼看到入到／入唔到各有幾多個 */}
      <div className="tier-summary">
        {TIER_ORDER.filter((tk) => tierCounts[tk]).map((tk) => (
          <span key={tk} className={`tier-pill ${TIER_CLS[tk]}`}>
            {t.tier(tk).label} {tierCounts[tk]}
          </span>
        ))}
      </div>

      {/* 範圍篩選：全部 / 入到 / 入唔到 */}
      <div className="scope-filter" role="group">
        <span className="filter-label">{t('filterScopeTitle')}</span>
        {['all', 'attainable', 'outOfReach'].map((sc) => (
          <button
            key={sc}
            className={`chip ${scope === sc ? 'active' : ''}`}
            onClick={() => setScope(sc)}
            type="button"
          >
            {t(sc === 'all' ? 'scopeAll' : sc === 'attainable' ? 'scopeAttainable' : 'scopeOutOfReach')} ({scopeCounts[sc]})
          </button>
        ))}
      </div>

      {/* 院校篩選 */}
      <div className="uni-filter">
        <span className="filter-label">{t('filterUniTitle')}</span>
        <button className={`chip ${uniFilter === 'all' ? 'active' : ''}`} onClick={() => setUniFilter('all')}>{t('filterAll')} ({applyScope(afterKw, scope).length})</button>
        {unis.map(([u, info]) => (
          <button key={u} className={`chip ${uniFilter === u ? 'active' : ''}`} onClick={() => setUniFilter(u)}>
            {(lang === 'en' ? u : t.s(info.zh || u))} ({info.n})
          </button>
        ))}
      </div>

      <div className="result-count">{t('showingN')} {shown.length}</div>
      <div className="gap-note">{t('gapPctNote')}</div>

      {renderGroup('attainable')}
      {renderGroup('outOfReach')}

      {selProg && (
        <DetailOverlay prog={selProg} year={2025} disciplines={disciplines} onClose={() => setSelProg(null)} />
      )}
      {reportFor && (
        <ReportModal
          onClose={() => setReportFor(null)}
          initialProgramme={`${reportFor.jupasCode} ${progName(reportFor)}（計分明細）`}
        />
      )}
    </div>
  );
}
