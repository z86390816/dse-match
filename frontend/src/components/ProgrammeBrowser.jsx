import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';

const CAT_LABELS = {
  medical: '醫科/護理', law: '法律', business: '商科', engineering: '工程',
  it: '資訊科技', science: '理科', social: '社會科學', arts: '藝術',
  humanities: '人文', education: '教育', general: '其他',
};
const SCHEME_LABEL = {
  bonusTop: '5**=8.5, 5*=7, 5=5.5, 4=4 …（2025 新制）',
  standard: '5**=7, 5*=6, 5=5, 4=4 …',
};
const SUBJ_NAME = {
  chin: '中文', eng: '英文', math: '數學', m1: 'M1', m2: 'M2', phys: '物理',
  chem: '化學', bio: '生物', econ: '經濟', bafs: 'BAFS', geog: '地理',
  hist: '歷史', chist: '中史', ict: 'ICT', va: '視藝',
};
const sn = (id) => SUBJ_NAME[id] || id;

function describeScoring(p) {
  if (p.method === 'hku' && p.formula) {
    const f = p.formula;
    const parts = (f.fixed || []).map((x) => `${x.weight}×${sn(x.subject)}`);
    parts.push(`最佳 ${f.bestN} 科`);
    if (f.tailWeight) parts.push(`${f.tailWeight}×第 ${f.bestN + 1} 佳`);
    return parts.join(' + ');
  }
  const n = p.method === 'best6' ? 6 : 5;
  const ws = Object.entries(p.weights || {});
  if (ws.length) return `最佳 ${n} 科；加重：${ws.map(([s, w]) => `${sn(s)}×${w}`).join('、')}`;
  return `最佳 ${n} 科（任何科目，不額外加權）`;
}

// 公民與社會發展只有達標/未達標，顯示時統一為「達標」
const reqMinLabel = (subject, min) =>
  /CITIZENSHIP/i.test(subject) ? '達標' : min;

const BAND_LABEL = {
  bandA: 'Band A（首 3 志願）', bandB: 'Band B（第 4–6 志願）', bandC: 'Band C（第 7–9）',
  bandD: 'Band D（第 10–15）', bandE: 'Band E（第 16–20）',
};

export default function ProgrammeBrowser() {
  const [programmes, setProgrammes] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [selUni, setSelUni] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState(null);
  const [selProg, setSelProg] = useState(null);
  const [appData, setAppData] = useState(null);
  const [loadingApp, setLoadingApp] = useState(false);

  useEffect(() => {
    api.getProgrammes().then((d) => { setProgrammes(d.programmes); setYear(d.year); });
    api.getUniversities().then((d) => {
      setUniversities(d.universities);
      if (d.universities[0]) setSelUni(d.universities[0].id);
    });
  }, []);

  function openProg(p) {
    setSelProg(p);
    setAppData(null);
    setLoadingApp(true);
    api.getApplications(p.jupasCode)
      .then((d) => setAppData(d.application))
      .catch(() => setAppData(null))
      .finally(() => setLoadingApp(false));
  }

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
      l = l.filter((p) => p.name.toLowerCase().includes(k) || (p.jupasCode || '').toLowerCase().includes(k));
    }
    return l.sort((a, b) => (a.jupasCode || '').localeCompare(b.jupasCode || ''));
  }, [programmes, selUni, keyword]);

  const bands2025 = appData?.bands?.['2025'];
  const maxBand = bands2025 ? Math.max(bands2025.bandA, bands2025.bandB, bands2025.bandC, bands2025.bandD, bands2025.bandE) : 0;

  return (
    <div className="browser">
      <div className="panel">
        <h3>選擇院校</h3>
        <div className="uni-filter">
          {universities.map((u) => (
            <button key={u.id} className={`chip ${selUni === u.id ? 'active' : ''}`}
              onClick={() => { setSelUni(u.id); setSelProg(null); }}>
              {u.short} ({countByUni[u.id] || 0})
            </button>
          ))}
        </div>
        <input className="search" placeholder="搜尋專業名稱 / JS code…"
          value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      {uni && (
        <div className="panel">
          <div className="browse-head">
            <h3>{uni.name}（{uni.short}）</h3>
            <span className="muted">{list.length} 個專業 · {year} 收生數據 · 點專業看詳情</span>
          </div>
          <div className="prog-table">
            <div className="prog-row prog-th">
              <span className="c-idx">#</span>
              <span className="c-code">JS</span>
              <span className="c-name">專業</span>
              <span className="c-cat">類別</span>
              <span className="c-num">中位</span>
              <span className="c-num">下四分</span>
            </div>
            {list.map((p, idx) => (
              <div className={`prog-row clickable ${selProg?.id === p.id ? 'sel' : ''}`} key={p.id} onClick={() => openProg(p)}>
                <span className="c-idx">{idx + 1}</span>
                <span className="c-code">{p.jupasCode}</span>
                <span className="c-name">
                  {p.name}
                  {p.scoreComparable === false && <span className="ref-tag">參考</span>}
                </span>
                <span className="c-cat">{CAT_LABELS[p.category] || p.category}</span>
                <span className="c-num">{p.admission?.median ?? '—'}</span>
                <span className="c-num">{p.admission?.lowerQuartile ?? '—'}</span>
              </div>
            ))}
          </div>
          <div className="scheme-note">計分換算：{SCHEME_LABEL[uni.gradeScheme] || uni.gradeScheme}</div>
        </div>
      )}

      {selProg && (
        <div className="panel detail-panel">
          <div className="browse-head">
            <h3>{selProg.jupasCode} · {selProg.name}</h3>
            <button className="chip" onClick={() => setSelProg(null)}>✕ 關閉</button>
          </div>

          <div className="detail-grid">
            <div><span className="dl">收生中位數</span><span className="dv">{selProg.admission?.median ?? '—'}</span></div>
            <div><span className="dl">下四分位數</span><span className="dv">{selProg.admission?.lowerQuartile ?? '—'}</span></div>
            <div><span className="dl">類別</span><span className="dv">{CAT_LABELS[selProg.category] || selProg.category}</span></div>
          </div>

          <div className="detail-block">
            <h4>計分方式 / 學科比重</h4>
            <p>{describeScoring(selProg)}</p>
            {selProg.weightsStatus === 'unweighted-approx' && <p className="muted">＊原校有科目加權，此處未完全還原，僅供參考。</p>}
          </div>

          {appData?.requirements?.length > 0 && (
            <div className="detail-block">
              <h4>核心科目最低要求</h4>
              <div className="req-list">
                {appData.requirements.map((r, i) => (
                  <span key={i} className="req-chip">{r.subject}：{reqMinLabel(r.subject, r.min)}</span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-block">
            <h4>報名人數（{year} · 改選後）</h4>
            {loadingApp && <p className="muted">載入中…</p>}
            {!loadingApp && !bands2025 && <p className="muted">暫無申請統計數據。</p>}
            {bands2025 && (
              <div className="bands">
                {['bandA', 'bandB', 'bandC', 'bandD', 'bandE'].map((b) => (
                  <div className="band-row" key={b}>
                    <span className="band-label">{BAND_LABEL[b]}</span>
                    <span className="band-bar"><span className="band-fill" style={{ width: `${maxBand ? (bands2025[b] / maxBand) * 100 : 0}%` }} /></span>
                    <span className="band-num">{bands2025[b]}</span>
                  </div>
                ))}
                <div className="band-total">總報名：{bands2025.total} 人</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
