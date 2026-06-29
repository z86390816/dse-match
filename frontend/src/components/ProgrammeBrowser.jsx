import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n.jsx';

const SCHEME_LABEL = {
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

function DetailOverlay({ prog, year, onClose }) {
  const { lang, t } = useLang();
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTrend, setShowTrend] = useState(false);

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

        <h3 style={{ marginTop: 12, fontSize: 17 }}>{lang === 'zh' && prog.nameZh ? prog.nameZh : prog.name}</h3>
        {lang === 'zh' && prog.nameZh && <p className="muted" style={{ margin: '2px 0 0' }}>{prog.name}</p>}

        <div className="detail-grid">
          {prog.admission?.upperQuartile != null && (
            <div><span className="dl">{t('upperQuartile')}</span><span className="dv">{prog.admission.upperQuartile}</span></div>
          )}
          <div><span className="dl">{t('median')}</span><span className="dv">{prog.admission?.median ?? '—'}</span></div>
          <div><span className="dl">{t('lowerQuartile')}</span><span className="dv">{prog.admission?.lowerQuartile ?? '—'}</span></div>
          <div><span className="dl">{t('colCategory')}</span><span className="dv" style={{ fontSize: 16 }}>{t.cat(prog.category)}</span></div>
        </div>

        <div className="detail-block">
          <h4>{t('scoringMethod')}</h4>
          <p>{describeScoring(prog, lang)}</p>
          {prog.weightsStatus === 'unweighted-approx' && <p className="muted">{t('weightApproxNote')}</p>}
        </div>

        {appData?.requirements?.length > 0 && (
          <div className="detail-block">
            <h4>{t('coreReq')}</h4>
            <div className="req-list">
              {appData.requirements.map((r, i) => (
                <span key={i} className="req-chip">{r.subject}：{reqMinLabel(r.subject, r.min, lang)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="detail-block">
          <h4>{t('applicants')}（{year} · {t('afterModify')}）</h4>
          {loading && <p className="muted">{t('loading')}</p>}
          {!loading && !bands2025 && <p className="muted">{t('noAppData')}</p>}
          {bands2025 && (
            <div className="bands">
              {['bandA', 'bandB', 'bandC', 'bandD', 'bandE'].map((b) => (
                <div className="band-row" key={b}>
                  <span className="band-label">{BAND_LABEL[lang][b]}</span>
                  <span className="band-bar"><span className="band-fill" style={{ width: `${maxBand ? (bands2025[b] / maxBand) * 100 : 0}%` }} /></span>
                  <span className="band-num">{bands2025[b]}</span>
                </div>
              ))}
              <div className="band-total">{t('totalApplicants')}：{bands2025.total} {t('people')}</div>
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

        <div className="scheme-note">{t('scoreScale')}：{SCHEME_LABEL[prog.gradeScheme] || prog.gradeScheme}</div>
      </div>
    </div>
  );
}

export default function ProgrammeBrowser() {
  const { lang, t } = useLang();
  const [programmes, setProgrammes] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [selUni, setSelUni] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState(null);
  const [selProg, setSelProg] = useState(null);

  useEffect(() => {
    api.getProgrammes().then((d) => { setProgrammes(d.programmes); setYear(d.year); });
    api.getUniversities().then((d) => {
      setUniversities(d.universities);
      if (d.universities[0]) setSelUni(d.universities[0].id);
    });
  }, []);

  const countByUni = useMemo(() => {
    const c = {};
    programmes.forEach((p) => { c[p.universityId] = (c[p.universityId] || 0) + 1; });
    return c;
  }, [programmes]);

  const uni = universities.find((u) => u.id === selUni);
  const list = useMemo(() => {
    let l = programmes.filter((p) => p.universityId === selUni);
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase();
      l = l.filter((p) => p.name.toLowerCase().includes(k) || (p.nameZh || '').includes(k) || (p.jupasCode || '').toLowerCase().includes(k));
    }
    return l.sort((a, b) => (a.jupasCode || '').localeCompare(b.jupasCode || ''));
  }, [programmes, selUni, keyword]);

  return (
    <div className="browser">
      <div className="panel">
        <h3>{t('selectInstitution')}</h3>
        <div className="uni-filter">
          {universities.map((u) => (
            <button key={u.id} className={`chip ${selUni === u.id ? 'active' : ''}`}
              onClick={() => { setSelUni(u.id); }}>
              {u.short} ({countByUni[u.id] || 0})
            </button>
          ))}
        </div>
        <input className="search" placeholder={t('searchPlaceholder')}
          value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      {uni && (
        <div className="panel">
          <div className="browse-head">
            <h3>{lang === 'en' ? uni.en : uni.name}（{uni.short}）</h3>
            <span className="muted">{list.length} {t('programmesUnit')} · {year}</span>
          </div>
          <div className="prog-table">
            <div className="prog-row prog-th">
              <span className="c-idx">{t('colIdx')}</span>
              <span className="c-code">JS</span>
              <span className="c-name">{t('colName')}</span>
              <span className="c-cat">{t('colCategory')}</span>
              <span className="c-num">{t('colUpperShort')}</span>
              <span className="c-num">{t('colMedianShort')}</span>
              <span className="c-num">{t('colLowerShort')}</span>
            </div>
            {list.map((p, idx) => (
              <div className={`prog-row clickable`} key={p.id} onClick={() => setSelProg(p)}>
                <span className="c-idx">{idx + 1}</span>
                <span className="c-code">{p.jupasCode}</span>
                <span className="c-name">
                  {lang === 'zh' && p.nameZh ? p.nameZh : p.name}
                  {p.scoreComparable === false && <span className="ref-tag">{t.tier('reference').label}</span>}
                </span>
                <span className="c-cat">{t.cat(p.category)}</span>
                <span className="c-num">{p.admission?.upperQuartile ?? '—'}</span>
                <span className="c-num">{p.admission?.median ?? '—'}</span>
                <span className="c-num">{p.admission?.lowerQuartile ?? '—'}</span>
              </div>
            ))}
          </div>
          <div className="scheme-note">{t('scoreScale')}：{SCHEME_LABEL[uni.gradeScheme] || uni.gradeScheme}</div>
        </div>
      )}

      {selProg && (
        <DetailOverlay prog={selProg} year={year} onClose={() => setSelProg(null)} />
      )}
    </div>
  );
}
