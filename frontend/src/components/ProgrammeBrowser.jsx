import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n.jsx';
import { DetailOverlay, SCHEME_LABEL } from './ProgrammeDetail.jsx';

export default function ProgrammeBrowser() {
  const { lang, t } = useLang();
  const [programmes, setProgrammes] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [selUni, setSelUni] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [year, setYear] = useState(null);
  const [selProg, setSelProg] = useState(null);
  const [disciplines, setDisciplines] = useState(null);

  useEffect(() => {
    api.getProgrammes().then((d) => { setProgrammes(d.programmes); setYear(d.year); });
    api.getUniversities().then((d) => {
      setUniversities(d.universities);
      if (d.universities[0]) setSelUni(d.universities[0].id);
    });
    api.getDisciplines().then((d) => setDisciplines(d.disciplines)).catch(() => {});
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
              {(lang === 'en' ? u.short : t.s(u.shortZh || u.short))} ({countByUni[u.id] || 0})
            </button>
          ))}
        </div>
        <input className="search" placeholder={t('searchPlaceholder')}
          value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      </div>

      {uni && (
        <div className="panel">
          <div className="browse-head">
            <h3>{lang === 'en' ? `${uni.en} (${uni.short})` : `${t.s(uni.name)}（${uni.short}）`}</h3>
            <span className="muted">{list.length} {t('programmesUnit')} · {year}</span>
          </div>
          <div className="prog-table">
            <div className="prog-row prog-th">
              <span className="c-idx">{t('colIdx')}</span>
              <span className="c-code">JS</span>
              <span className="c-name">{t('colName')}</span>
              <span className="c-cat">{t('colCategory')}</span>
              <span className="c-num">{t('colMedianShort')}</span>
              <span className="c-num">{t('colAdmShort')}</span>
            </div>
            {list.map((p, idx) => (
              <div className={`prog-row clickable`} key={p.id} onClick={() => setSelProg(p)}>
                <span className="c-idx">{idx + 1}</span>
                <span className="c-code">{p.jupasCode}</span>
                <span className="c-name">
                  {lang !== 'en' && p.nameZh ? t.s(p.nameZh) : p.name}
                  {p.scoreComparable === false && <span className="ref-tag">{t.tier('reference').label}</span>}
                </span>
                <span className="c-cat">{t.cat(p.category)}</span>
                <span className="c-num c-score">{p.admission?.median ?? '—'}</span>
                <span className="c-num c-adm">{p.admitted2025 > 0 ? p.admitted2025 : '—'}</span>
              </div>
            ))}
          </div>
          <div className="scheme-note">{t('scoreScale')}{t.sep}{SCHEME_LABEL[uni.gradeScheme] || uni.gradeScheme}</div>
        </div>
      )}

      {selProg && (
        <DetailOverlay prog={selProg} year={year} disciplines={disciplines} onClose={() => setSelProg(null)} />
      )}
    </div>
  );
}
