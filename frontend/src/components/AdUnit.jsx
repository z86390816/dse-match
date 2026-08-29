import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT_ID } from '../config';

// AdSense 廣告版位。傳入 slot（版位 ID）。
//
// 沒設定 slot 時**什麼都不渲染**，而不是畫一個佔位框。原因有兩個，都花過真錢：
//   1. 佔位框不會帶來收入，卻佔掉結果頁最值錢的第一屏位置；
//   2. AdSense 人工審核看到「廣告版位（設定後自動顯示廣告）」這種空框，
//      會判定站點是為廣告而建、內容未就緒——這是網站審核被拒的典型理由。
//      本站審核失敗過數次，這個框是可疑來源之一。
//
// 版位 ID 未填時的收入路徑是 **Auto Ads**：index.html 的 head 已靜態載入
// 頁面級腳本，只要在 AdSense 後台開啟「自動廣告」，Google 就會自行挑位置投放，
// 不需要任何 slot ID、不需要改這裡的程式碼。手動版位（填 AD_SLOTS）是想
// 精確控制位置時才需要，兩者可並存。
export default function AdUnit({ slot }) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) { /* AdSense 尚未載入完成，忽略 */ }
  }, [slot]);

  if (!ADSENSE_CLIENT_ID || !slot) return null;

  return (
    <ins
      className="adsbygoogle ad-unit"
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
