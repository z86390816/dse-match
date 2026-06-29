import { useLang } from '../i18n.jsx';

// 成績輸入表單：核心必修固定在前，選修自由填。
export default function ScoreForm({ subjects, gradeOptions, csdGrades, grades, setGrades }) {
  const { lang, t } = useLang();
  function setGrade(id, value) {
    setGrades((prev) => {
      const next = { ...prev };
      if (value === '') delete next[id];
      else next[id] = value;
      return next;
    });
  }

  const core = subjects.filter((s) => s.core);
  const electives = subjects.filter((s) => !s.core);
  const subjName = (s) => (lang === 'en' ? s.en : s.name);

  return (
    <div className="score-form">
      <h3>{t('coreSubjects')}</h3>
      <div className="grid">
        {core.map((s) => (
          <div className="field" key={s.id}>
            <label>{subjName(s)}</label>
            {s.passFail ? (
              <select value={grades[s.id] || ''} onChange={(e) => setGrade(s.id, e.target.value)}>
                <option value="">—</option>
                {csdGrades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            ) : (
              <select value={grades[s.id] || ''} onChange={(e) => setGrade(s.id, e.target.value)}>
                <option value="">—</option>
                {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </div>
        ))}
      </div>

      <h3>{t('electiveSubjects')}</h3>
      <div className="grid">
        {electives.map((s) => (
          <div className="field" key={s.id}>
            <label>{subjName(s)}</label>
            <select value={grades[s.id] || ''} onChange={(e) => setGrade(s.id, e.target.value)}>
              <option value="">—</option>
              {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
