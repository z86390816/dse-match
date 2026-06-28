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

export default function ProgrammeBrowser() {
  const [programmes, setProgrammes] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [selUni, setSelUni] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState(null);

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
      l = l.filter((p) => p.name.toLowerCase().includes(k) || (p.jupasCode || '').toLowerCase().includes(k));
    }
    return l.sort((a, b) => (a.jupasCode || '').localeCompare(b.jupasCode || ''));
  }, [programmes, selUni, keyword]);

  return (
    <div className="browser">
      <div className="panel">
        <h3>選擇院校</h3>
        <div className="uni-filter">
          {universities.map((u) => (
            <button key={u.id} className={`chip ${selUni === u.id ? 'active' : ''}`} onClick={() => setSelUni(u.id)}>
              {u.short} ({countByUni[u.id] || 0})
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="搜尋專業名稱 / JS code…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </div>

      {uni && (
        <div className="panel">
          <div className="browse-head">
            <h3>{uni.name}（{uni.short}）</h3>
            <span className="muted">{list.length} 個專業 · {year} 收生數據</span>
          </div>
          <div className="prog-table">
            <div className="prog-row prog-th">
              <span className="c-code">JS</span>
              <span className="c-name">專業</span>
              <span className="c-cat">類別</span>
              <span className="c-num">中位數</span>
              <span className="c-num">下四分</span>
            </div>
            {list.map((p) => (
              <div className="prog-row" key={p.id}>
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
          <div className="scheme-note">
            計分換算：{SCHEME_LABEL[uni.gradeScheme] || uni.gradeScheme}
          </div>
        </div>
      )}
    </div>
  );
}
