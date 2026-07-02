// 生成小紅書「內頁」圖（簡體、3:4、1080×1440，淺底好讀）→ xhs/*.png
// 三篇筆記各 2 張：乾貨詳解 + 結尾 CTA。配色與封面成套。
import sharp from 'sharp';
import fs from 'fs';

const W = 1080, H = 1440;
const F = '"Microsoft YaHei","Microsoft JhengHei","PingFang SC","Noto Sans CJK SC",sans-serif';
fs.mkdirSync('xhs', { recursive: true });

// 顏色淡化（給高亮底用）
const tint = { blue: '#e6efff', green: '#dcfce7', purple: '#f3e8ff' };
const dark = { blue: '#1d4ed8', green: '#0f766e', purple: '#6d28d9' };

function rowLight(y, t1, t2, accent, dot) {
  return `
  <circle cx="124" cy="${y - 12}" r="13" fill="${dot || accent}"/>
  <text x="168" y="${y}" font-family='${F}' font-size="44" font-weight="800" fill="#0f1b2d">${t1}</text>
  <text x="168" y="${y + 48}" font-family='${F}' font-size="33" fill="#5b6b80">${t2}</text>`;
}

// lines: 高亮框 1–2 行
function highlight(y, accent, tintC, darkC, lines) {
  const h = lines.length > 1 ? 168 : 120;
  const t = lines.map((s, i) =>
    `<text x="${W / 2}" y="${y + 46 + i * 54}" font-family='${F}' font-size="37" font-weight="800" fill="${darkC}" text-anchor="middle">${s}</text>`).join('');
  return `<rect x="70" y="${y}" width="940" height="${h}" rx="26" fill="${tintC}"/>
    <rect x="70" y="${y}" width="12" height="${h}" rx="6" fill="${accent}"/>${t}`;
}

async function slide(name, accent, tintC, darkC, kicker, titleLines, rows, hiLines) {
  const title = titleLines.map((s, i) =>
    `<text x="70" y="${300 + i * 108}" font-family='${F}' font-size="98" font-weight="800" fill="${accent}">${s}</text>`).join('');
  const rowY = [700, 840, 980];
  const rowSvg = rows.map((r, i) => rowLight(rowY[i], r[0], r[1], accent, r[2])).join('');
  const hiY = rows.length >= 3 ? 1100 : 960;
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#0b1b3a" flood-opacity="0.10"/></filter></defs>
    <rect width="${W}" height="${H}" fill="#f4f7fb"/>
    <rect x="70" y="96" width="${18 + kicker.length * 30}" height="64" rx="32" fill="${accent}"/>
    <text x="${70 + (18 + kicker.length * 30) / 2}" y="138" font-family='${F}' font-size="32" font-weight="700" fill="#fff" text-anchor="middle">${kicker}</text>
    ${title}
    <g filter="url(#sh)"><rect x="70" y="600" width="940" height="440" rx="34" fill="#ffffff"/></g>
    ${rowSvg}
    ${highlight(hiY, accent, tintC, darkC, hiLines)}
    <text x="${W / 2}" y="${H - 60}" font-family='${F}' font-size="40" font-weight="800" fill="#94a3b8" text-anchor="middle">dsemarks.com</text>
    <text x="${W / 2}" y="${H - 108}" font-family='${F}' font-size="28" fill="#b6c2d4" text-anchor="middle" letter-spacing="2">JUPAS Calculator · 免费</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`xhs/${name}.png`);
  console.log('→ xhs/' + name + '.png');
}

/* ═══ 筆記① 計分方法（藍）═══ */
await slide('01b_hku', '#2563eb', tint.blue, dark.blue, 'JUPAS 计分 · ①港大',
  ['港大 HKU', '加权计分'],
  [['英文 ×1.5、数学 ×1.5', '核心科加权，占比更重'],
   ['理科生算「最佳理科」', '物化生取最好一科再加权'],
   ['M1 / M2 会计入', '读了就有用，别浪费两年']],
  ['例：5** 在港大加权后 = 8.5 分']);

await slide('01c_others', '#2563eb', tint.blue, dark.blue, 'JUPAS 计分 · ②中大及其他',
  ['中大加权', '＋科大城大理大'],
  [['中大 CUHK', '多科加权，5** 当 8.5 分'],
   ['科大 / 城大 / 理大', '多为 Best 5 或 Best 6'],
   ['个别专业有指定科要求', '填志愿前逐科看清楚']],
  ['👉 同一成绩不同科差好远', '用 JUPAS Calculator 一键算准']);

/* ═══ 筆記② 多少分入U（綠）═══ */
await slide('02b_median', '#0d9488', tint.green, dark.green, '收生中位数 · 怎么看',
  ['「收生中位数」', '到底是什么？'],
  [['去年考进这科的学生', '一半人比它高、一半比它低'],
   ['你的分 ≥ 中位数', '＝ 相对稳妥'],
   ['只看中位数不够', '要用该专业的计分法去比才准']],
  ['💡 349 个专业中位数，站内一次查完']);

await slide('02c_tier', '#0d9488', tint.green, dark.green, '收生中位数 · 智能分类',
  ['稳妥 / 进取', '一眼看清'],
  [['稳妥', '你的分数 ≥ 收生中位数', '#16a34a'],
   ['进取', '介于下四分位与中位数之间', '#ca8a04'],
   ['搏一搏', '略低于下四分位，可以博', '#ea580c']],
  ['👉 输入成绩自动帮你分类', 'dsemarks.com']);

/* ═══ 筆記③ M1/M2（紫）═══ */
await slide('03b_cases', '#7c3aed', tint.purple, dark.purple, 'M1/M2 · 三种情况',
  ['M1/M2 算不算', '看这三种'],
  [['① 当一科计', '港大理科/工程/商科，甚至加权'],
   ['② 数学 或 M1/M2 二选一', '哪科分高就用哪科'],
   ['③ 只当普通选修', '部分专业甚至不计']],
  ['⚠️ 完全取决于你填的专业怎么算']);

await slide('03c_check', '#7c3aed', tint.purple, dark.purple, 'M1/M2 · 别白读',
  ['怎么知道', '你那科算不算？'],
  [['把 M1/M2 成绩也输进去', '工具按每个专业计分法帮你算'],
   ['立刻看到帮不帮得上', '值不值钱一目了然'],
   ['再对比收生中位数', '穩妥或搏一搏心里有数']],
  ['👉 JUPAS Calculator 免费查', 'dsemarks.com']);

console.log('完成：6 张内页图已生成于 data-pipeline/xhs/');
