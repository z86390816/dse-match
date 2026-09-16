import { useEffect, useMemo, useState } from 'react';
import { useLang } from '../i18n.jsx';
import { api } from '../api';
import { SUBJECT_MAP } from '../engine/subjects.js';
import { DetailOverlay } from './ProgrammeDetail.jsx';
import ReportModal from './ReportModal.jsx';

const TIER_ORDER = ['safe', 'competitive', 'reach', 'below', 'unqualified', 'reference'];
const TIER_CLS = { safe: 'safe', competitive: 'competitive', reach: 'reach', below: 'below', unqualified: 'unqualified', reference: 'below' };

// 三組：「入到」＝穩陣／有機會／衝刺；「入唔到」＝機會偏低／未符要求；
// 「僅供參考」＝計分方式無法複製，有分數也不能跟收生中位數比。
const ATTAINABLE_TIERS = ['safe', 'competitive', 'reach'];
const GROUPS = ['attainable', 'outOfReach', 'reference'];
const groupOf = (r) => (r.tier === 'reference' ? 'reference'
  : ATTAINABLE_TIERS.includes(r.tier) ? 'attainable' : 'outOfReach');

const SORTS = ['medianDesc', 'medianAsc', 'match'];
const SCOPE_LABEL = { all: 'scopeAll', attainable: 'scopeAttainable', outOfReach: 'scopeOutOfReach', reference: 'scopeReference' };
const SORT_LABEL = { medianDesc: 'sortMedianDesc', medianAsc: 'sortMedianAsc', match: 'sortMatch' };

// 一次先渲染多少張卡；「入唔到」那組動輒 200+ 個專業，全部一次過畫會拖慢手機。
const PAGE = 30;

// 按收生中位數排。各校尺度不同（PolyU ~200 制），所以這是「這科收幾多分」的排名，
// 不是跨校難度比較——難度比較請用「最易入到」那個排序。
function byMedian(dir) {
  return (a, b) => {
    const ma = a.admission?.median, mb = b.admission?.median;
    if (ma == null && mb == null) return (a.jupasCode || '').localeCompare(b.jupasCode || '');
    if (ma == null) return 1;   // 無收生數據的永遠排最後
    if (mb == null) return -1;
    if (ma !== mb) return (ma - mb) * dir;
    return (a.jupasCode || '').localeCompare(b.jupasCode || '');
  };
}

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
  // 引擎回傳 { subject, min, got }，句子在這裡按語言砌
  const reqText = (x) => {
    if (x.subject === 'csd') return t('reqCsd');
    const sub = SUBJECT_MAP[x.subject];
    const name = lang === 'en' ? (sub?.en || x.subject) : t.s(sub?.name || x.subject);
    return lang === 'en'
      ? `${name} ${t('reqNeedLevel')} ${x.min} (${t('reqYours')} ${x.got})`
      : `${name} ${t('reqNeedLevel')} ${x.min}（${t('reqYours')}${x.got}）`;
  };
  const [uniFilter, setUniFilter] = useState('all');
  // 預設「全部」：入到、入唔到同僅供參考全部都要睇得到。
  const [scope, setScope] = useState('all'); // 'all' | attainable | outOfReach | reference
  // 預設按收生分由高到低——即係一張「邊科收得高」的排名表。
  const [sort, setSort] = useState('medianDesc');
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

  const applyScope = (list, sc) => (sc === 'all' ? list : list.filter((r) => groupOf(r) === sc));
  const applyUni = (list, u) => (u === 'all' ? list : list.filter((r) => r.universityShort === u));

  const scopeCounts = useMemo(() => {
    const l = applyUni(afterKw, uniFilter);
    const c = { all: l.length, attainable: 0, outOfReach: 0, reference: 0 };
    l.forEach((r) => { c[groupOf(r)] += 1; });
    return c;
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

  const shown = useMemo(() => {
    const l = applyUni(applyScope(afterKw, scope), uniFilter);
    // 'match' 即 matchAll 原本的「等級 → 相對差距」排序，不用再動。
    return sort === 'match' ? l : [...l].sort(byMedian(sort === 'medianAsc' ? 1 : -1));
  }, [afterKw, scope, uniFilter, sort]);

  const groups = useMemo(() => {
    const g = { attainable: [], outOfReach: [], reference: [] };
    shown.forEach((r) => g[groupOf(r)].push(r));
    return g; // shown 已排好，分組時順序照搬
  }, [shown]);

  const tierCounts = useMemo(() => {
    const c = {};
    (results || []).forEach((r) => { c[r.tier] = (c[r.tier] || 0) + 1; });
    return c;
  }, [results]);

  // 換篩選就收回「載入更多」，否則切過去會直接見到上一組展開後的長度。
  const initialLimits = () => ({ attainable: PAGE, outOfReach: PAGE, reference: PAGE });
  const [limits, setLimits] = useState(initialLimits);
  useEffect(() => { setLimits(initialLimits()); }, [kw, scope, uniFilter, sort, results]);

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

        {!r.requirementOk && r.requirementReasons?.length > 0 && (
          <div className="req-warn">⚠️ {r.requirementReasons.map(reqText).join(lang === 'en' ? '; ' : '；')}</div>
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

  const GROUP_CLS = { attainable: 'attainable', outOfReach: 'out-of-reach', reference: 'reference' };
  const GROUP_HEAD = { attainable: 'sectionAttainable', outOfReach: 'sectionOutOfReach', reference: 'sectionReference' };
  const GROUP_EMPTY = { attainable: 'sectionAttainableEmpty', outOfReach: 'sectionOutOfReachEmpty', reference: 'sectionReferenceEmpty' };

  function renderGroup(key) {
    const list = groups[key];
    // 只選了一組時不必再標題分段——chip 已經講清楚在看哪一組。
    if (scope !== 'all' && list.length === 0) return null;
    // 「僅供參考」只得十幾科，沒有就整段收起，唔好白白佔位。
    if (scope === 'all' && key === 'reference' && list.length === 0) return null;
    const limit = limits[key];
    return (
      <section className={`result-group ${GROUP_CLS[key]}`} key={key}>
        {scope === 'all' && (
          <h4 className="group-head">
            {t(GROUP_HEAD[key])}
            <span className="group-count">{list.length}</span>
          </h4>
        )}
        {list.length === 0
          ? <div className="group-empty">{t(GROUP_EMPTY[key])}</div>
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
        {['all', ...GROUPS].map((sc) => (
          <button
            key={sc}
            className={`chip ${scope === sc ? 'active' : ''}`}
            onClick={() => setScope(sc)}
            type="button"
          >
            {t(SCOPE_LABEL[sc])} ({scopeCounts[sc]})
          </button>
        ))}
      </div>

      {/* 排序：預設收生分由高到低，即一張「邊科收得高」的排名表 */}
      <div className="scope-filter" role="group">
        <span className="filter-label">{t('filterSortTitle')}</span>
        {SORTS.map((sk) => (
          <button
            key={sk}
            className={`chip ${sort === sk ? 'active' : ''}`}
            onClick={() => setSort(sk)}
            type="button"
          >
            {t(SORT_LABEL[sk])}
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

      {GROUPS.map(renderGroup)}

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
