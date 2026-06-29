import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT_ID } from '../config';

// AdSense 廣告版位。傳入 slot（版位 ID）。
// 未設定 client/slot 時顯示佔位框，方便排版預覽，不會報錯。
export default function AdUnit({ slot, label = '廣告' }) {
  const ref = useRef(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (e) { /* AdSense 尚未載入完成，忽略 */ }
  }, [slot]);

  if (!ADSENSE_CLIENT_ID || !slot) {
    return <div className="ad-placeholder">{label}位（待 AdSense 審核通過後自動顯示）</div>;
  }

  return (
    <ins
      ref={ref}
      className="adsbygoogle ad-unit"
      style={{ display: 'block' }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}
