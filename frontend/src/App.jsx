import { useEffect, useState } from 'react';
import { api } from './api';
import ScoreForm from './components/ScoreForm.jsx';
import ResultList from './components/ResultList.jsx';

const INTEREST_LABELS = {
  science: '理科', business: '商科', medical: '醫科 / 護理', engineering: '工程',
  it: '資訊科技', social: '社會科學', arts: '藝術', humanities: '人文',
  education: '教育', law: '法律', language: '語言',
};

export default function App() {
  const [subjects, setSubjects] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [csdGrades, setCsdGrades] = useState([]);
  const [interests, setInterests] = useState([]);

  const [grades, setGrades] = useState({});
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [onlyAttainable, setOnlyAttainable] = useState(false);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSubjects().then((d) => {
      setSubjects(d.subjects);
      setGradeOptions(d.gradeOptions);
      setCsdGrades(d.csdGrades);
    }).catch((e) => setError(e.message));
    api.getInterests().then((d) => setInterests(d.interests)).catch(() => {});
  }, []);

  function toggleInterest(i) {
    setSelectedInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const useRecommend = selectedInterests.length > 0 || onlyAttainable;
      const data = useRecommend
        ? await api.recommend(grades, selectedInterests, onlyAttainable)
        : await api.match(grades);
      setResults(data.results);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🎓 DSE 收生分數比對</h1>
        <p className="sub">輸入你的 DSE 成績，看看能配對哪些香港大學專業（2025 年數據）</p>
      </header>

      <div className="notice">
        ⚠️ 目前收生分數為<strong>示例數據</strong>，僅供功能展示，非官方真實分數，請勿用於實際升學決策。
      </div>

      <main className="layout">
        <section className="panel form-panel">
          <ScoreForm
            subjects={subjects}
            gradeOptions={gradeOptions}
            csdGrades={csdGrades}
            grades={grades}
            setGrades={setGrades}
          />

          <div className="interests">
            <h3>興趣（可選，用作推薦）</h3>
            <div className="chips">
              {interests.map((i) => (
                <button
                  key={i}
                  className={`chip ${selectedInterests.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleInterest(i)}
                  type="button"
                >
                  {INTEREST_LABELS[i] || i}
                </button>
              ))}
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={onlyAttainable}
                onChange={(e) => setOnlyAttainable(e.target.checked)}
              />
              只顯示我有機會入到的（穩陣 / 有機會 / 衝刺）
            </label>
          </div>

          <button className="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? '計算中…' : '開始比對'}
          </button>
          {error && <div className="error">{error}</div>}
        </section>

        <section className="panel result-panel">
          <ResultList results={results} />
        </section>
      </main>
    </div>
  );
}
