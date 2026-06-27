// 成績輸入表單：核心必修固定在前，選修自由填。
export default function ScoreForm({ subjects, gradeOptions, csdGrades, grades, setGrades }) {
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

  return (
    <div className="score-form">
      <h3>必修科目</h3>
      <div className="grid">
        {core.map((s) => (
          <div className="field" key={s.id}>
            <label>{s.name}</label>
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

      <h3>選修科目（填你有報考的）</h3>
      <div className="grid">
        {electives.map((s) => (
          <div className="field" key={s.id}>
            <label>{s.name}</label>
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
