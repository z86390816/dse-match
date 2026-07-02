// 生成小紅書封面圖（簡體、3:4、1080×1440）→ xhs/*.png
// 對應三篇筆記：①計分方法 ②多少分入U ③M1/M2 算不算分
import sharp from 'sharp';
import fs from 'fs';

const W = 1080, H = 1440;
const F = '"Microsoft YaHei","Microsoft JhengHei","PingFang SC","Noto Sans CJK SC",sans-serif';
fs.mkdirSync('xhs', { recursive: true });

// 漸層背景（可換色）
const bg = (c1, c2, c3) => `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="0.55" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.85" cy="0.06" r="0.75">
    <stop offset="0" stop-color="#fff" stop-opacity="0.20"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#0b1b3a" flood-opacity="0.25"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;

// 圓角標籤（頂部小 tag）
const chip = (x, y, w, h, txt, fs = 34) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" fill-opacity="0.18"/>
   <text x="${x + w / 2}" y="${y + h / 2 + fs * 0.35}" font-family='${F}' font-size="${fs}" font-weight="700" fill="#fff" text-anchor="middle">${txt}</text>`;

async function render(name, palette, inner) {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    ${bg(...palette)}${inner}
    <text x="${W / 2}" y="${H - 60}" font-family='${F}' font-size="44" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="1">dsemarks.com</text>
    <text x="${W / 2}" y="${H - 108}" font-family='${F}' font-size="30" fill="#e0ecff" text-anchor="middle" letter-spacing="2">JUPAS Calculator · 免费</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`xhs/${name}.png`);
  console.log('→ xhs/' + name + '.png');
}

/* ── 封面 1：JUPAS 计分方法（靛蓝）── */
await render('01_scoring', ['#1e3a8a', '#2563eb', '#3b82f6'], `
  ${chip(70, 96, 330, 66, '📌 DSE 放榜前必看')}
  <text x="70" y="360" font-family='${F}' font-size="150" font-weight="800" fill="#fff">JUPAS</text>
  <text x="70" y="510" font-family='${F}' font-size="150" font-weight="800" fill="#bfdbfe">计分方法</text>
  <text x="70" y="600" font-family='${F}' font-size="52" font-weight="700" fill="#eaf2ff">港三大不一样！你算对了吗？😵</text>
  <g filter="url(#sh)">
    <rect x="70" y="700" width="940" height="470" rx="34" fill="#ffffff"/>
    ${row(740, '港大 HKU', '英×1.5 · 数×1.5 · 计 M1/M2', '#2563eb')}
    ${row(880, '中大 CUHK', '加权 · 5** 当 8.5 分', '#16a34a')}
    ${row(1020, '科大/城大/理大', 'Best 5 / Best 6 + 指定科', '#ea580c')}
  </g>`);

/* ── 封面 2：多少分入 U（翠绿）── */
await render('02_scores', ['#065f46', '#0d9488', '#22c55e'], `
  ${chip(70, 96, 300, 66, '📊 收藏备用')}
  <text x="70" y="330" font-family='${F}' font-size="128" font-weight="800" fill="#fff">多少分</text>
  <text x="70" y="470" font-family='${F}' font-size="128" font-weight="800" fill="#d1fae5">能进大学？</text>
  <text x="70" y="558" font-family='${F}' font-size="50" font-weight="700" fill="#eafff4">349 个专业收生中位数 一览</text>
  <g filter="url(#sh)">
    <rect x="70" y="660" width="940" height="560" rx="34" fill="#ffffff"/>
    ${score(700, '🏥 医科 / 牙科', '40+', '#dc2626')}
    ${score(786, '💼 商科 / 环球商业', '40+', '#ea580c')}
    ${score(872, '⚖️ 法律', '高分', '#ca8a04')}
    ${score(958, '💻 计算机 / AI / 数据', '↑ 热门', '#2563eb')}
    ${score(1044, '🧪 理学 / 工程', '选择多', '#0d9488')}
    ${score(1130, '📚 文社科 / 教育', '较亲民', '#16a34a')}
  </g>`);

/* ── 封面 3：M1/M2 算不算分（紫罗兰）── */
await render('03_m1m2', ['#4c1d95', '#7c3aed', '#a855f7'], `
  ${chip(70, 96, 330, 66, '🧠 港大计分冷知识')}
  <text x="70" y="360" font-family='${F}' font-size="150" font-weight="800" fill="#fff">M1/M2</text>
  <text x="70" y="510" font-family='${F}' font-size="140" font-weight="800" fill="#e9d5ff">算不算分？</text>
  <text x="70" y="602" font-family='${F}' font-size="52" font-weight="700" fill="#f3e8ff">读了两年，千万别吃亏 😱</text>
  <g filter="url(#sh)">
    <rect x="70" y="700" width="940" height="470" rx="34" fill="#ffffff"/>
    ${row(740, '① 当一科计', '港大理科/工程/商科，甚至加权', '#7c3aed')}
    ${row(880, '② 数学 或 M1/M2', '二选一，取分高那科', '#2563eb')}
    ${row(1020, '③ 只当普通选修', '部分科不计——逐科看清楚！', '#dc2626')}
  </g>`);

console.log('完成：3 张小红书封面已生成于 data-pipeline/xhs/');

/* 白卡内一行：标题 + 说明 + 左侧色条 */
function row(y, title, desc, color) {
  return `
  <rect x="104" y="${y - 44}" width="10" height="96" rx="5" fill="${color}"/>
  <text x="140" y="${y - 2}" font-family='${F}' font-size="44" font-weight="800" fill="#0f1b2d">${title}</text>
  <text x="140" y="${y + 46}" font-family='${F}' font-size="34" fill="#5b6b80">${desc}</text>`;
}
/* 分数榜一行：科目 + 分数徽章 */
function score(y, label, val, color) {
  return `
  <text x="110" y="${y + 4}" font-family='${F}' font-size="42" font-weight="700" fill="#0f1b2d">${label}</text>
  <rect x="800" y="${y - 34}" width="180" height="52" rx="26" fill="${color}" fill-opacity="0.12"/>
  <text x="890" y="${y + 3}" font-family='${F}' font-size="38" font-weight="800" fill="${color}" text-anchor="middle">${val}</text>`;
}
