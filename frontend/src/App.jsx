import { useEffect, useState } from 'react';
import { api } from './api';
import ScoreForm from './components/ScoreForm.jsx';
import ResultList from './components/ResultList.jsx';
import ProgrammeBrowser from './components/ProgrammeBrowser.jsx';
import AdUnit from './components/AdUnit.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import { trackPageView, trackEvent } from './analytics';
import { AD_SLOTS } from './config';
import { useLang } from './i18n.jsx';

export default function App() {
  const { lang, setLang, t } = useLang();
  const [subjects, setSubjects] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [csdGrades, setCsdGrades] = useState([]);
  const [interests, setInterests] = useState([]);

  // 公民與社會發展預設「達標」（多數考生達標）
  const [grades, setGrades] = useState({ csd: '達標' });
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [onlyAttainable, setOnlyAttainable] = useState(false);

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState('match'); // 'match' | 'browse' | 'results' | 'privacy'

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
        <button className="lang-toggle" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          {lang === 'zh' ? 'EN' : '中'}
        </button>
        <h1>{t('appTitle')}</h1>
        <p className="sub">{t('appSub')}</p>
      </header>

      <div className="notice">ℹ️ {t('notice')}</div>

      <nav className="tabs">
        <button className={`tab ${view === 'match' || view === 'results' ? 'active' : ''}`} onClick={() => setView('match')}>
          {t('tabMatch')}
        </button>
        <button className={`tab ${view === 'browse' ? 'active' : ''}`} onClick={() => setView('browse')}>
          {t('tabBrowse')}
        </button>
      </nav>

      {view === 'privacy' && <PrivacyPolicy onBack={() => setView('match')} />}

      {view === 'browse' && (
      <>
        <AdUnit slot={AD_SLOTS.browseTop} label={t('adLabel')} />
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
            <h3>{t('interestsTitle')}</h3>
            <div className="chips">
              {interests.map((i) => (
                <button
                  key={i}
                  className={`chip ${selectedInterests.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleInterest(i)}
                  type="button"
                >
                  {t.cat(i)}
                </button>
              ))}
            </div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={onlyAttainable}
                onChange={(e) => setOnlyAttainable(e.target.checked)}
              />
              {t('onlyAttainable')}
            </label>
          </div>
          {error && <div className="error">{error}</div>}
        </section>

        {/* 浮動於頁面底部的開始比對按鈕 */}
        <div className="submit-bar">
          <button className="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? t('submitting') : t('submit')}
          </button>
        </div>
      </main>
      )}

      {view === 'results' && (
      <main className="layout">
        <button className="back-link" onClick={() => setView('match')}>{t('backToEdit')}</button>
        <AdUnit slot={AD_SLOTS.resultsTop} label={t('adLabel')} />
        <section className="panel result-panel">
          <ResultList results={results} />
        </section>
      </main>
      )}

      <footer className="site-footer">
        <button className="link-btn" onClick={() => setView('privacy')}>{t('privacyLink')}</button>
        <span> {t('footerDisclaimer')} © {new Date().getFullYear()} JUPAS Calculator</span>
      </footer>
    </div>
  );
}
