// Google Analytics 4 + AdSense 載入器。
// 只有在 config.js 填了 ID 時才會注入對應 script，否則完全不執行。
import { GA_MEASUREMENT_ID } from './config';

let gaReady = false;

export function initAnalytics() {
  // ---- Google Analytics 4 ----
  if (GA_MEASUREMENT_ID && !gaReady) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false });
    gaReady = true;
  }

  // AdSense script 已靜態置於 index.html <head>（供 AdSense 檢索器驗證），此處不再動態注入。
}

// 記錄一次「頁面瀏覽」（SPA 切換 tab 時呼叫）
export function trackPageView(page) {
  if (window.gtag) window.gtag('event', 'page_view', { page_title: page, page_path: '/' + page });
}

// 記錄自訂事件（例如「按下開始比對」）
export function trackEvent(name, params = {}) {
  if (window.gtag) window.gtag('event', name, params);
}
