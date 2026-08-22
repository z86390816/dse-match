import { useLang } from '../i18n.jsx';

// 收生分數的逐年變化標記。
// 分數升＝該課程更難入（對考生不利）→ 紅；分數跌＝更易入 → 綠。
// 官方明言收生分數不可跨年比較，公式有變的課程 (comparable:false) 以灰色淡化並附說明。
export default function DeltaChip({ delta, field = 'median', size = 'sm' }) {
  const { t } = useLang();
  if (!delta) return null;
  const v = delta[field];
  if (v == null) return null;

  const dir = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '＝';
  const cls = delta.comparable === false ? 'delta-chip delta-muted' : `delta-chip delta-${dir}`;
  const label = dir === 'up' ? t('deltaUp') : dir === 'down' ? t('deltaDown') : t('deltaFlat');

  return (
    <span
      className={`${cls} delta-${size}`}
      title={`${label}｜${t('vsPrevYear')}${delta.vsYear ? ` (${delta.vsYear})` : ''}${
        delta.comparable === false ? `\n${t('deltaNotComparable')}` : ''
      }`}
    >
      {arrow} {v > 0 ? '+' : ''}{v}
    </span>
  );
}
