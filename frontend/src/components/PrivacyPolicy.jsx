import { useLang } from '../i18n.jsx';

// 私隱政策 —— Google AdSense / Analytics 審核要求網站必須具備。雙語。
export default function PrivacyPolicy({ onBack }) {
  const { lang, t } = useLang();
  const en = lang === 'en';
  const s = t.s; // 繁→簡（簡體模式）
  return (
    <main className="layout">
      <button className="back-link" onClick={onBack}>{t('back')}</button>
      <section className="panel legal">
        <h2>{en ? 'Privacy Policy' : s('私隱政策')}</h2>
        <p className="muted">{en ? 'Last updated: 2026' : s('最後更新：2026 年')}</p>

        {en ? (
          <>
            <h3>1. Information We Collect</h3>
            <p>JUPAS Calculator is a free university admission-score matching tool. The DSE results you enter are used
            only in your browser for instant calculation — we do <strong>not store or upload</strong> your
            personal results to any database.</p>

            <h3>2. Cookies & Analytics</h3>
            <p>We use <strong>Google Analytics</strong> to understand overall site usage (e.g. daily visitors,
            most-viewed features) so we can improve the service. This data is anonymous and cannot identify you
            personally.</p>

            <h3>3. Third-Party Advertising</h3>
            <p>This site shows ads via <strong>Google AdSense</strong>. Google and its partners may use cookies
            to serve ads based on your prior visits. You can manage or opt out of personalised advertising at
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer"> Google Ads Settings </a>
            or review the
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer"> Google advertising policies</a>.</p>

            <h3>4. Accuracy of Data</h3>
            <p>All admission scores, scoring formulas and application statistics are compiled from JUPAS and
            institutions’ public data, for reference only. Actual admission criteria are determined by each
            institution’s official announcements; we accept no liability for decisions made using this tool.</p>

            <h3>5. Contact</h3>
            <p>For any questions about this policy, or to report inaccurate data, email us at
            <a href="mailto:feedback@dsemarks.com"> feedback@dsemarks.com</a>.</p>
          </>
        ) : (
          <>
            <h3>{s('1. 我們收集的資料')}</h3>
            <p>{s('本網站（JUPAS Calculator）是一個免費的大學收生分數比對工具。你輸入的 DSE 成績只在你的瀏覽器內用作即時計算，我們')}<strong>{s('不會儲存、不會上傳')}</strong>{s('你的個人成績到任何資料庫。')}</p>

            <h3>{s('2. Cookie 與分析')}</h3>
            <p>{s('我們使用 ')}<strong>Google Analytics</strong>{s(' 了解網站的整體使用情況（例如每日訪客數、最多人查看的功能），以改善服務。這些資料是匿名統計，無法用來識別你的個人身份。')}</p>

            <h3>{s('3. 第三方廣告')}</h3>
            <p>{s('本網站透過 ')}<strong>Google AdSense</strong>{s(' 顯示廣告。Google 及其合作夥伴可能使用 Cookie，根據你過往的瀏覽紀錄投放相關廣告。你可以前往')}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">{s(' Google 廣告設定 ')}</a>
            {s('管理或關閉個人化廣告，亦可參閱')}
            <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">{s(' Google 廣告政策')}</a>{s('。')}</p>

            <h3>{s('4. 資料準確性')}</h3>
            <p>{s('所有收生分數、計分公式及報名統計均整理自 JUPAS 及各院校公開資料，僅供參考。實際收生準則以各院校官方公布為準，本網站不對因使用本工具所作的決定承擔責任。')}</p>

            <h3>{s('5. 聯絡')}</h3>
            <p>{s('如對本私隱政策有任何疑問，或發現數據不準，歡迎電郵至')}
            <a href="mailto:feedback@dsemarks.com"> feedback@dsemarks.com</a>{s('。')}</p>
          </>
        )}
      </section>
    </main>
  );
}
