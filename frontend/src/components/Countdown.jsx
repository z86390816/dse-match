import { useLang } from '../i18n.jsx';

// 距離 DSE 放榜日（7 月 15 日）的倒數。固定於頂部。
function daysToResults() {
  const now = new Date();
  const year = now.getFullYear();
  let target = new Date(year, 6, 15); // 7 月 = month index 6
  // 若今年 7/15 已過，倒數到明年
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (startOfToday > target) target = new Date(year + 1, 6, 15);
  return Math.round((target - startOfToday) / 86400000);
}

export default function Countdown() {
  const { lang } = useLang();
  const d = daysToResults();
  const en = lang === 'en';

  let text;
  if (d === 0) {
    text = en ? '🎉 DSE results are out TODAY! Best of luck — may you land your dream programme!'
             : '🎉 今日就是 DSE 放榜日！祝你金榜題名，入到心儀專業！';
  } else {
    text = en
      ? <>🎓 <strong>{d}</strong> {d === 1 ? 'day' : 'days'} to DSE results (Jul 15) · Wishing everyone their dream programme!</>
      : <>🎓 距 DSE 放榜（7 月 15 日）還有 <strong>{d}</strong> 日 · 祝大家都入到心儀專業！</>;
  }

  return <div className="countdown-banner">{text}</div>;
}
