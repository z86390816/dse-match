// 生成小紅書／IG 宣傳圖（1080×1350 直向）→ promo/*.png
import sharp from 'sharp';
import fs from 'fs';

const W = 1080, H = 1350;
const F = '"Microsoft JhengHei","PingFang HK","Noto Sans CJK TC",sans-serif';
fs.mkdirSync('promo', { recursive: true });

const bg = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#1e3a8a"/><stop offset="0.55" stop-color="#2563eb"/><stop offset="1" stop-color="#3b82f6"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.85" cy="0.05" r="0.7">
    <stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>`;

const chip = (x, y, w, h, txt, fs = 30) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffffff" fill-opacity="0.16"/>
   <text x="${x + w / 2}" y="${y + h / 2 + fs * 0.35}" font-family='${F}' font-size="${fs}" font-weight="700" fill="#fff" text-anchor="middle">${txt}</text>`;

async function render(name, inner) {
  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bg}${inner}
    <text x="${W / 2}" y="${H - 54}" font-family='${F}' font-size="40" font-weight="800" fill="#fff" text-anchor="middle" letter-spacing="1">dsemarks.com</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(`promo/${name}.png`);
  console.log('→ promo/' + name + '.png');
}

// 1. 封面 / 鉤子
await render('01_cover', `
  ${chip(70, 90, 300, 60, 'DSE 放榜 2025 · JUPAS')}
  <text x="70" y="330" font-family='${F}' font-size="94" font-weight="800" fill="#fff">1 秒查到</text>
  <text x="70" y="450" font-family='${F}' font-size="94" font-weight="800" fill="#bfdbfe">你能入邊間</text>
  <text x="70" y="540" font-family='${F}' font-size="40" fill="#e0ecff">輸入 DSE 成績，即刻比對</text>
  <text x="70" y="596" font-family='${F}' font-size="40" fill="#e0ecff">全港 9 大 · 349 個專業</text>
  <g>
    <rect x="70" y="680" width="940" height="470" rx="30" fill="#ffffff"/>
    <rect x="104" y="720" width="150" height="48" rx="24" fill="#dcfce7"/>
    <text x="179" y="753" font-family='${F}' font-size="27" font-weight="800" fill="#166534" text-anchor="middle">穩陣</text>
    <text x="104" y="850" font-family='${F}' font-size="34" font-weight="700" fill="#0f1b2d">你的分數</text>
    <text x="104" y="940" font-family='${F}' font-size="96" font-weight="800" fill="#2563eb">27.5</text>
    <line x1="104" y1="985" x2="976" y2="985" stroke="#e3e9f0" stroke-width="2"/>
    <text x="104" y="1050" font-family='${F}' font-size="34" fill="#5b6b80">收生中位數</text>
    <text x="976" y="1050" font-family='${F}' font-size="34" font-weight="700" fill="#0f1b2d" text-anchor="end">24</text>
    <text x="104" y="1110" font-family='${F}' font-size="34" fill="#5b6b80">2025 取錄人數</text>
    <text x="976" y="1110" font-family='${F}' font-size="34" font-weight="700" fill="#ea580c" text-anchor="end">19 人</text>
  </g>`);

// 2. 三步教學
const step = (y, n, t1, t2) => `
  <circle cx="120" cy="${y}" r="46" fill="#ffffff"/>
  <text x="120" y="${y + 20}" font-family='${F}' font-size="54" font-weight="800" fill="#2563eb" text-anchor="middle">${n}</text>
  <text x="200" y="${y - 6}" font-family='${F}' font-size="46" font-weight="800" fill="#fff">${t1}</text>
  <text x="200" y="${y + 44}" font-family='${F}' font-size="32" fill="#dbeafe">${t2}</text>`;
await render('02_howto', `
  <text x="70" y="200" font-family='${F}' font-size="72" font-weight="800" fill="#fff">3 步搵到你嘅</text>
  <text x="70" y="292" font-family='${F}' font-size="72" font-weight="800" fill="#bfdbfe">心儀神科 🎯</text>
  ${step(500, '1', '輸入 DSE 成績', '各科等級揀一揀就得')}
  ${step(700, '2', '即時比對收生分數', '按每間大學官方公式計分')}
  ${step(900, '3', '睇埋深入數據', '取錄人數 · 歷年趨勢 · AI 就業分析')}
  <rect x="70" y="1040" width="940" height="90" rx="20" fill="#ffffff" fill-opacity="0.14"/>
  <text x="540" y="1096" font-family='${F}' font-size="40" font-weight="700" fill="#fff" text-anchor="middle">完全免費 · 中英雙語 · 即開即用</text>`);

// 3. 數據 / 功能亮點
const feat = (y, t) => `
  <text x="105" y="${y}" font-family='${F}' font-size="46" fill="#22c55e">✓</text>
  <text x="170" y="${y}" font-family='${F}' font-size="42" font-weight="600" fill="#fff">${t}</text>`;
await render('03_features', `
  <text x="70" y="200" font-family='${F}' font-size="70" font-weight="800" fill="#fff">全港最齊</text>
  <text x="70" y="288" font-family='${F}' font-size="70" font-weight="800" fill="#bfdbfe">JUPAS 收生數據</text>
  ${feat(430, '官方 2025 收生中位／上下四分位')}
  ${feat(520, '每個專業 2025 取錄人數＋學額')}
  ${feat(610, '歷年報名趨勢圖（部分達 10+ 年）')}
  ${feat(700, 'AI 香港就業前景與方向分析')}
  ${feat(790, '報名 Band A–E 人數統計')}
  ${feat(880, '9 大院校 · 349 個專業全收錄')}
  <rect x="70" y="980" width="940" height="150" rx="24" fill="#ffffff"/>
  <text x="540" y="1050" font-family='${F}' font-size="40" fill="#5b6b80" text-anchor="middle">放榜前後必備工具</text>
  <text x="540" y="1105" font-family='${F}' font-size="46" font-weight="800" fill="#2563eb" text-anchor="middle">dsemarks.com</text>`);

console.log('完成');
