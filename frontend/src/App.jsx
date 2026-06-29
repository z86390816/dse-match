import { useEffect, useState } from 'react';
import { api } from './api';
import ScoreForm from './components/ScoreForm.jsx';
import ResultList from './components/ResultList.jsx';
import ProgrammeBrowser from './components/ProgrammeBrowser.jsx';
import AdUnit from './components/AdUnit.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import { trackPageView, trackEvent } from './analytics';
import { AD_SLOTS } from './config';

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
  const [view, setView] = useState('match'); // 'match' | 'browse' | 'results'

  useEffect(() => {
    api.getSubjects().then((d) => {
      setSubjects(d.subjects);
      setGradeOptions(d.gradeOptions);
      setCsdGrades(d.csdGrades);
    }).catch((e) => setError(e.message));
    api.getInterests().then((d) => setInterests(d.interests)).catch(() => {});
  }, []);

  // 切換頁面時記錄一次 GA 瀏覽
  useEffect(() => { trackPageView(view); }, [view]);

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
      setView('results');
      trackEvent('run_match', { interests: selectedInterests.length, count: data.results?.length || 0 });
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
        ℹ️ 收生中位數／下四分位數來自 <strong>JUPAS 官方 2025 數據</strong>（全 9 所院校）。
        分數計算盡量還原各校公式，部分課程（標「僅供參考」）因計分較複雜未能精確比對。結果僅供參考，請以官方為準。
      </div>

      <nav className="tabs">
        <button className={`tab ${view === 'match' || view === 'results' ? 'active' : ''}`} onClick={() => setView('match')}>
          🎯 成績比對
        </button>
        <button className={`tab ${view === 'browse' ? 'active' : ''}`} onClick={() => setView('browse')}>
          📚 瀏覽專業
        </button>
      </nav>

      {view === 'privacy' && <PrivacyPolicy onBack={() => setView('match')} />}

      {view === 'browse' && (
      <>
        <AdUnit slot={AD_SLOTS.browseTop} label="頂部廣告" />
        <ProgrammeBrowser />
      </>
      )}

      {view === 'match' && (
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
      </main>
      )}

      {view === 'results' && (
      <main className="layout">
        <button className="back-link" onClick={() => setView('match')}>← 返回修改成績</button>
        <AdUnit slot={AD_SLOTS.resultsTop} label="結果頁廣告" />
        <section className="panel result-panel">
          <ResultList results={results} />
        </section>
      </main>
      )}

      <footer className="site-footer">
        <button className="link-btn" onClick={() => setView('privacy')}>私隱政策</button>
        <span>· 數據僅供參考，請以各院校官方公布為準 · © {new Date().getFullYear()} DSE Marks</span>
      </footer>
    </div>
  );
}
