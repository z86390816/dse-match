import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n.jsx';

export const SCHEME_LABEL = {
  bonusTop: '5**=8.5, 5*=7, 5=5.5, 4=4 …',
  standard: '5**=7, 5*=6, 5=5, 4=4 …',
};
const SUBJ_NAME = {
  zh: {
    chin: '中文', eng: '英文', math: '數學', m1: 'M1', m2: 'M2', phys: '物理',
    chem: '化學', bio: '生物', cit: '組合科學', ist: '綜合科學',
    econ: '經濟', bafs: 'BAFS', ths: '旅款',
    geog: '地理', hist: '歷史', chist: '中史', chlit: '中國文學', englit: '英語文學', ethics: '倫理與宗教',
    ict: 'ICT', dat: 'DAT', hmsc: '健社', tl: '科技與生活',
    va: '視藝', music: '音樂', pe: '體育',
  },
  en: {
    chin: 'Chi', eng: 'Eng', math: 'Math', m1: 'M1', m2: 'M2', phys: 'Phys',
    chem: 'Chem', bio: 'Bio', cit: 'Comb Sci', ist: 'Int Sci',
    econ: 'Econ', bafs: 'BAFS', ths: 'THS',
    geog: 'Geog', hist: 'Hist', chist: 'Chi Hist', chlit: 'Chi Lit', englit: 'Eng Lit', ethics: 'ERS',
    ict: 'ICT', dat: 'DAT', hmsc: 'HMSC', tl: 'T&L',
    va: 'VA', music: 'Music', pe: 'PE',
  },
};

function describeScoring(p, lang) {
  const sn = (id) => SUBJ_NAME[lang][id] || id;
  const isEn = lang === 'en';
  if (p.method === 'hku' && p.formula) {
    const f = p.formula;
    const parts = (f.fixed || []).map((x) => `${x.weight}×${sn(x.subject)}`);
    parts.push(isEn ? `Best ${f.bestN}` : `最佳 ${f.bestN} 科`);
    if (f.tailWeight) parts.push(isEn ? `${f.tailWeight}×${f.bestN + 1}th best` : `${f.tailWeight}×第 ${f.bestN + 1} 佳`);
    return parts.join(' + ');
  }
  const n = p.method === 'best6' ? 6 : 5;
  const ws = Object.entries(p.weights || {});
  // PolyU 官方加權：科目眾多，只列最高權重的科目
  if (p.weightsStatus === 'official-polyu' && ws.length) {
    const maxW = Math.max(...ws.map(([, w]) => w));
    const topSubs = ws.filter(([, w]) => w === maxW).map(([s]) => sn(s));
    const top = topSubs.slice(0, 6).join(isEn ? ', ' : '、') + (topSubs.length > 6 ? (isEn ? '…' : '等') : '');
    return isEn
      ? `Weighted best ${n} (official, ~350 scale); highest weight ×${maxW}: ${top}`
      : `官方加權最佳 ${n} 科（約 350 滿分）；最高權重 ×${maxW}：${top}`;
  }
  if (ws.length) {
    const wstr = ws.map(([s, w]) => `${sn(s)}×${w}`).join(isEn ? ', ' : '、');
    return isEn ? `Best ${n}; weighted: ${wstr}` : `最佳 ${n} 科；加重：${wstr}`;
  }
  return isEn ? `Best ${n} (any subjects, no extra weighting)` : `最佳 ${n} 科（任何科目，不額外加權）`;
}

const reqMinLabel = (subject, min, lang) =>
  /CITIZENSHIP/i.test(subject) ? (lang === 'en' ? 'Attained' : '達標') : min;

const BAND_LABEL = {
  zh: { bandA: 'Band A（首3志願）', bandB: 'Band B（4–6）', bandC: 'Band C（7–9）', bandD: 'Band D（10–15）', bandE: 'Band E（16–20）' },
  en: { bandA: 'Band A (1st–3rd)', bandB: 'Band B (4–6)', bandC: 'Band C (7–9)', bandD: 'Band D (10–15)', bandE: 'Band E (16–20)' },
};

// 由真實數據（報名、取錄、收生分、趨勢）自動生成的分析洞察。
function buildAnalysis(prog, appData, lang) {
  const en = lang === 'en';
  const out = [];
  const b25 = appData?.bands?.['2025'];
  const adm = prog.admitted2025;
  const apps = b25?.total;

  // 0. 課程事實（學制／面試／資助）
  if (prog.facts && (prog.facts.duration || prog.facts.interview != null || prog.facts.funding)) {
    const f = prog.facts; const parts = [];
    if (f.duration) parts.push(en ? f.duration : f.duration.replace(/years?/i, '年'));
    if (f.interview != null) parts.push(en ? (f.interview ? 'interview required' : 'no interview') : (f.interview ? '需面試' : '免面試'));
    if (f.funding) parts.push(en ? f.funding : f.funding.replace(/UGC-funded/i, '政府資助 (UGC)').replace(/Self-financ\w*/i, '自資'));
    out.push({ icon: '🎓', text: parts.join(' · ') });
  }

  // 1. 競爭程度 + 取錄率
  if (apps && adm > 0) {
    const ratio = apps / adm;
    const rate = Math.round((adm / apps) * 100);
    const lvZh = ratio >= 15 ? '競爭激烈' : ratio >= 6 ? '競爭頗大' : '競爭相對溫和';
    const lvEn = ratio >= 15 ? 'highly competitive' : ratio >= 6 ? 'quite competitive' : 'relatively moderate';
    out.push({
      icon: '🔥',
      text: en
        ? `${apps} applicants for ${adm} offers — about ${Math.round(ratio)}:1 (offer rate ≈ ${rate}%), ${lvEn}.`
        : `共 ${apps} 人報讀、正式遴選取錄 ${adm} 人，約 ${Math.round(ratio)} 人爭 1 個學位（取錄率約 ${rate}%），${lvZh}。`,
    });
  }

  // 2. 首志願壓力
  if (b25?.bandA != null && adm > 0) {
    const over = b25.bandA > adm;
    out.push({
      icon: '🎯',
      text: en
        ? `${b25.bandA} applicants placed it in Band A (top-3 choices)${over ? ' — already more than the offers, so lower-priority applicants have slim chances.' : ', close to the number of offers.'}`
        : `以首三志願（Band A）報讀有 ${b25.bandA} 人${over ? '，已多於取錄名額，非首志願者機會較微。' : '，與取錄人數相若。'}`,
    });
  }

  // 3. 報名趨勢
  if (appData?.bands) {
    const ys = Object.keys(appData.bands).sort();
    if (ys.length >= 2) {
      const latest = ys[ys.length - 1];
      const base = ys.find((y) => +y >= +latest - 4) || ys[0];
      const t0 = appData.bands[base]?.total, t1 = appData.bands[latest]?.total;
      if (t0 && t1) {
        const pct = ((t1 - t0) / t0) * 100;
        if (Math.abs(pct) >= 10) {
          out.push({
            icon: pct > 0 ? '📈' : '📉',
            text: en
              ? `Applications ${pct > 0 ? 'rose' : 'fell'} from ${t0} (${base}) to ${t1} (${latest}), ${pct > 0 ? '+' : ''}${Math.round(pct)}% — ${pct > 0 ? 'rising interest' : 'cooling demand'}.`
              : `報讀人數由 ${base} 年 ${t0} 人${pct > 0 ? '上升' : '下跌'}至 ${latest} 年 ${t1} 人（${pct > 0 ? '+' : ''}${Math.round(pct)}%），${pct > 0 ? '熱度上升' : '報讀轉冷'}。`,
          });
        } else {
          out.push({
            icon: '➖',
            text: en ? `Applications have been broadly stable in recent years (≈ ${t1}).` : `近年報讀人數大致平穩（約 ${t1} 人）。`,
          });
        }
      }
    }
  }

  // 4. 收生分數定位
  if (prog.scoreComparable !== false && prog.admission?.median != null) {
    const m = prog.admission.median;
    out.push({
      icon: '📊',
      text: en
        ? `2025 median admission score ${m}${prog.admission.lowerQuartile != null ? ` (lower quartile ${prog.admission.lowerQuartile})` : ''}.`
        : `2025 收生中位數 ${m} 分${prog.admission.lowerQuartile != null ? `（下四分位 ${prog.admission.lowerQuartile} 分）` : ''}。`,
    });
  }

  return out;
}

function TrendChart({ bands, years, t }) {
  const W = 600, H = 200, PX = 48, PY = 24, PB = 28;
  const cw = W - PX - 12, ch = H - PY - PB;
  const scale = Math.max(...years.map((y) => bands[y]?.total || 0), 1);
  const pts = (key) => years.map((y, i) => {
    const v = bands[y]?.[key] || 0;
    const x = PX + (years.length > 1 ? (i / (years.length - 1)) * cw : cw / 2);
    const yy = PY + ch - (v / scale) * ch;
    return [x, yy, v, y];
  });
  const totalPts = pts('total');
  const bandAPts = pts('bandA');
  const line = (arr) => arr.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
  const gridLines = 4;
  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart">
        {Array.from({ length: gridLines + 1 }, (_, i) => {
          const y = PY + (ch / gridLines) * i;
          const v = Math.round(scale * (1 - i / gridLines));
          return (
            <g key={i}>
              <line x1={PX} y1={y} x2={W - 12} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PX - 6} y={y + 4} textAnchor="end" fill="#64748b" fontSize="10">{v}</text>
            </g>
          );
        })}
        {years.map((y, i) => {
          const x = PX + (years.length > 1 ? (i / (years.length - 1)) * cw : cw / 2);
          const show = years.length <= 8 || i % Math.ceil(years.length / 8) === 0 || i === years.length - 1;
          return show ? <text key={y} x={x} y={H - 6} textAnchor="middle" fill="#64748b" fontSize="10">{y.slice(2)}</text> : null;
        })}
        <path d={line(totalPts)} fill="none" stroke="#2563eb" strokeWidth="2" />
        {totalPts.map(([x, y, v, yr]) => (
          <circle key={`t-${yr}`} cx={x} cy={y} r="3" fill="#2563eb"><title>{yr}: {v}</title></circle>
        ))}
        <path d={line(bandAPts)} fill="none" stroke="#16a34a" strokeWidth="2" strokeDasharray="5,3" />
        {bandAPts.map(([x, y, v, yr]) => (
          <circle key={`a-${yr}`} cx={x} cy={y} r="3" fill="#16a34a"><title>{yr}: Band A {v}</title></circle>
        ))}
      </svg>
      <div className="trend-legend">
        <span><span className="legend-line total" />{t('trendTotal')}</span>
        <span><span className="legend-line banda" />{t('trendBandA')}</span>
      </div>
    </div>
  );
}

function TrendTable({ bands, years }) {
  return (
    <div className="trend-table-wrap">
      <table className="trend-table">
        <thead>
          <tr><th>Year</th><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>Total</th></tr>
        </thead>
        <tbody>
          {[...years].reverse().map((y) => {
            const b = bands[y];
            return (
              <tr key={y}>
                <td>{y}</td>
                <td>{b?.bandA ?? '—'}</td><td>{b?.bandB ?? '—'}</td><td>{b?.bandC ?? '—'}</td>
                <td>{b?.bandD ?? '—'}</td><td>{b?.bandE ?? '—'}</td><td className="trend-total">{b?.total ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DetailOverlay({ prog, year, disciplines, onClose }) {
  const { lang, t } = useLang();
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrend, setShowTrend] = useState(false);
  const disc = disciplines?.[prog.discipline];
  const discText = disc ? (lang === 'en' ? disc.en : t.s(disc.zh)) : null;
  const careerText = disc ? (lang === 'en' ? disc.careerEn : t.s(disc.careerZh)) : null;

  useEffect(() => {
    setLoading(true);
    api.getApplications(prog.jupasCode)
      .then((d) => setAppData(d.application))
      .catch(() => setAppData(null))
      .finally(() => setLoading(false));
  }, [prog.jupasCode]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const bands2025 = appData?.bands?.['2025'];
  const maxBand = bands2025 ? Math.max(bands2025.bandA, bands2025.bandB, bands2025.bandC, bands2025.bandD, bands2025.bandE) : 0;

  const trendYears = useMemo(() => {
    if (!appData?.bands) return [];
    return Object.keys(appData.bands).sort();
  }, [appData]);

  return (
    <div className="detail-overlay">
      <div className="detail-inner">
        <div className="detail-top-bar">
          <button className="back-btn" onClick={onClose}>{t('back')}</button>
          <h3>{prog.jupasCode}</h3>
        </div>

        <h3 style={{ marginTop: 12, fontSize: 17 }}>{lang !== 'en' && prog.nameZh ? t.s(prog.nameZh) : prog.name}</h3>
        {lang !== 'en' && prog.nameZh && <p className="muted" style={{ margin: '2px 0 0' }}>{prog.name}</p>}

        {prog.admitted2025 > 0 && (
          <div className="admit-hero">
            <div className="admit-hero-main">
              <span className="admit-hero-num">{prog.admitted2025}</span>
              <span className="admit-hero-label">{t('admitted2025')}</span>
            </div>
            {prog.intake > 0 && (
              <div className="admit-hero-sub">
                <span className="admit-hero-num2">{prog.intake}</span>
                <span className="admit-hero-label">{t('intakeQuota')}</span>
              </div>
            )}
          </div>
        )}

        <div className="detail-grid">
          {prog.admission?.upperQuartile != null && (
            <div><span className="dl">{t('upperQuartile')}</span><span className="dv">{prog.admission.upperQuartile}</span></div>
          )}
          <div><span className="dl">{t('median')}</span><span className="dv">{prog.admission?.median ?? '—'}</span></div>
          <div><span className="dl">{t('lowerQuartile')}</span><span className="dv">{prog.admission?.lowerQuartile ?? '—'}</span></div>
          <div><span className="dl">{t('colCategory')}</span><span className="dv" style={{ fontSize: 16 }}>{t.cat(prog.category)}</span></div>
        </div>

        <div className="detail-block">
          <div className="trend-header">
            <h4>{t('aiAnalysis')}</h4>
            <span className="ai-badge">AI</span>
          </div>
          {discText && (
            <div className="ai-overview">
              <span className="ai-overview-tag">{lang === 'en' ? disc.nameEn : t.s(disc.nameZh)}</span>
              <span>{discText}</span>
            </div>
          )}
          <ul className="ai-list">
            {buildAnalysis(prog, appData, t.clang).map((ins, i) => (
              <li key={i}><span className="ai-icon">{ins.icon}</span><span>{t.s(ins.text)}</span></li>
            ))}
          </ul>
          {careerText && (
            <div className="ai-career">
              <div className="ai-career-head">💼 {t('careerOutlook')}</div>
              <p>{careerText}</p>
            </div>
          )}
          <p className="muted" style={{ fontSize: 11 }}>{t('aiNote')}</p>
        </div>

        <div className="detail-block">
          <h4>{t('scoringMethod')}</h4>
          <p>{t.s(describeScoring(prog, t.clang))}</p>
          {prog.weightsStatus === 'unweighted-approx' && <p className="muted">{t('weightApproxNote')}</p>}
        </div>

        {appData?.requirements?.length > 0 && (
          <div className="detail-block">
            <h4>{t('coreReq')}</h4>
            <div className="req-list">
              {appData.requirements.map((r, i) => (
                <span key={i} className="req-chip">{r.subject}{t.sep}{t.s(reqMinLabel(r.subject, r.min, t.clang))}</span>
              ))}
            </div>
          </div>
        )}

        <div className="detail-block">
          <h4>{lang === 'en' ? `${t('applicants')} (${year} · ${t('afterModify')})` : `${t('applicants')}（${year} · ${t('afterModify')}）`}</h4>
          {loading && <p className="muted">{t('loading')}</p>}
          {!loading && !bands2025 && <p className="muted">{t('noAppData')}</p>}
          {bands2025 && (
            <div className="bands">
              {['bandA', 'bandB', 'bandC', 'bandD', 'bandE'].map((b) => (
                <div className="band-row" key={b}>
                  <span className="band-label">{t.s(BAND_LABEL[t.clang][b])}</span>
                  <span className="band-bar"><span className="band-fill" style={{ width: `${maxBand ? (bands2025[b] / maxBand) * 100 : 0}%` }} /></span>
                  <span className="band-num">{bands2025[b]}</span>
                </div>
              ))}
              <div className="band-total">{t('totalApplicants')}{t.sep}{bands2025.total} {t('people')}</div>
            </div>
          )}
        </div>

        {trendYears.length > 1 && (
          <div className="detail-block">
            <div className="trend-header">
              <h4>{t('trendTitle')}</h4>
              <button className="chip" onClick={() => setShowTrend(!showTrend)}>
                {showTrend ? t('collapseTable') : t('expandTable')}
              </button>
            </div>
            <TrendChart bands={appData.bands} years={trendYears} t={t} />
            {showTrend && <TrendTable bands={appData.bands} years={trendYears} />}
          </div>
        )}
        {!loading && bands2025 && trendYears.length <= 1 && (
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>{t('newCodeNote')}</p>
        )}

        <div className="scheme-note">{t('scoreScale')}{t.sep}{SCHEME_LABEL[prog.gradeScheme] || prog.gradeScheme}</div>
      </div>
    </div>
  );
}
