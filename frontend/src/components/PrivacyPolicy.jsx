// 私隱政策 —— Google AdSense / Analytics 審核要求網站必須具備。
export default function PrivacyPolicy({ onBack }) {
  return (
    <main className="layout">
      <button className="back-link" onClick={onBack}>← 返回</button>
      <section className="panel legal">
        <h2>私隱政策</h2>
        <p className="muted">最後更新：2026 年</p>

        <h3>1. 我們收集的資料</h3>
        <p>本網站（DSE Marks）是一個免費的大學收生分數比對工具。你輸入的 DSE 成績只在你的瀏覽器內用作即時計算，
        我們<strong>不會儲存、不會上傳</strong>你的個人成績到任何資料庫。</p>

        <h3>2. Cookie 與分析</h3>
        <p>我們使用 <strong>Google Analytics</strong> 了解網站的整體使用情況（例如每日訪客數、最多人查看的功能），
        以改善服務。這些資料是匿名統計，無法用來識別你的個人身份。</p>

        <h3>3. 第三方廣告</h3>
        <p>本網站透過 <strong>Google AdSense</strong> 顯示廣告。Google 及其合作夥伴可能使用 Cookie，
        根據你過往的瀏覽紀錄投放相關廣告。你可以前往
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer"> Google 廣告設定 </a>
        管理或關閉個人化廣告，亦可參閱
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer"> Google 廣告政策</a>。</p>

        <h3>4. 資料準確性</h3>
        <p>所有收生分數、計分公式及報名統計均整理自 JUPAS 及各院校公開資料，僅供參考。
        實際收生準則以各院校官方公布為準，本網站不對因使用本工具所作的決定承擔責任。</p>

        <h3>5. 聯絡</h3>
        <p>如對本私隱政策有任何疑問，歡迎透過網站聯絡方式與我們聯繫。</p>
      </section>
    </main>
  );
}
