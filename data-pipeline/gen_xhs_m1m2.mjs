// 針對「M1/M2 算不算分」這篇筆記，作一套 3 張圖（簡體、3:4、1080×1440）→ xhs/m1m2_*.png
import sharp from 'sharp';
import fs from 'fs';

const W = 1080, H = 1440;
const F = '"Microsoft YaHei","Microsoft JhengHei","PingFang SC","Noto Sans CJK SC",sans-serif';
fs.mkdirSync('xhs', { recursive: true });
const ACC = '#7c3aed', TINT = '#f3e8ff', DARK = '#6d28d9';

async function save(name, svg) {
  await sharp(Buffer.from(`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`)).png().toFile(`xhs/${name}.png`);
  console.log('→ xhs/' + name + '.png');
}
const brand = (light) => `
  <text x="${W / 2}" y="${H - 60}" font-family='${F}' font-size="42" font-weight="800" fill="${light ? '#94a3b8' : '#fff'}" text-anchor="middle" letter-spacing="1">dsemarks.com</text>
  <text x="${W / 2}" y="${H - 108}" font-family='${F}' font-size="28" fill="${light ? '#b6c2d4' : '#e0d6ff'}" text-anchor="middle" letter-spacing="2">JUPAS Calculator · 免费</text>`;
const chip = (x, y, txt, fill, fg) => {
  const w = 22 + txt.length * 31;
  return `<rect x="${x}" y="${y}" width="${w}" height="66" rx="33" fill="${fill}"/>
    <text x="${x + w / 2}" y="${y + 44}" font-family='${F}' font-size="33" font-weight="700" fill="${fg}" text-anchor="middle">${txt}</text>`;
};
const row = (y, t1, t2, dot) => `
  <circle cx="126" cy="${y - 12}" r="13" fill="${dot || ACC}"/>
  <text x="170" y="${y}" font-family='${F}' font-size="43" font-weight="800" fill="#0f1b2d">${t1}</text>
  <text x="170" y="${y + 47}" font-family='${F}' font-size="32" fill="#5b6b80">${t2}</text>`;
const hi = (y, lines, h = 168) => `
  <rect x="70" y="${y}" width="940" height="${h}" rx="26" fill="${TINT}"/>
  <rect x="70" y="${y}" width="12" height="${h}" rx="6" fill="${ACC}"/>
  ${lines.map((s, i) => `<text x="${W / 2}" y="${y + 60 + i * 56}" font-family='${F}' font-size="37" font-weight="800" fill="${DARK}" text-anchor="middle">${s}</text>`).join('')}`;
const shadow = `<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#0b1b3a" flood-opacity="0.10"/></filter></defs>`;

/* ── 第 1 張：鉤子 ── */
await save('m1m2_1_hook', `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c1d95"/><stop offset="0.55" stop-color="#7c3aed"/><stop offset="1" stop-color="#a855f7"/></linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.06" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="sh2"><feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#1e0b3a" flood-opacity="0.25"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${chip(70, 96, '🧠 DSE 冷知识', 'rgba(255,255,255,0.18)', '#fff')}
  <text x="70" y="380" font-family='${F}' font-size="150" font-weight="800" fill="#fff">M1 / M2</text>
  <text x="70" y="524" font-family='${F}' font-size="132" font-weight="800" fill="#e9d5ff">算不算分？</text>
  <text x="70" y="620" font-family='${F}' font-size="50" font-weight="700" fill="#f3e8ff">搞不清楚，可能白读两年 😭</text>
  <g filter="url(#sh2)">
    <rect x="70" y="760" width="940" height="360" rx="34" fill="#ffffff"/>
    <text x="120" y="880" font-family='${F}' font-size="46" font-weight="700" fill="#5b6b80">答案是👇</text>
    <text x="120" y="972" font-family='${F}' font-size="60" font-weight="800" fill="#0f1b2d">要看你报</text>
    <text x="120" y="1052" font-family='${F}' font-size="60" font-weight="800" fill="${ACC}">哪个专业！</text>
  </g>
  ${brand(false)}`);

/* ── 第 2 張：三种情况 ── */
await save('m1m2_2_cases', `
  ${shadow}
  <rect width="${W}" height="${H}" fill="#f4f7fb"/>
  ${chip(70, 96, '📍 先分清楚 3 种情况', ACC, '#fff')}
  <text x="70" y="300" font-family='${F}' font-size="94" font-weight="800" fill="${ACC}">M1/M2</text>
  <text x="70" y="404" font-family='${F}' font-size="94" font-weight="800" fill="${ACC}">这样计</text>
  <g filter="url(#sh)"><rect x="70" y="500" width="940" height="540" rx="34" fill="#ffffff"/></g>
  ${row(620, '① 当一科计（甚至加权）', '港大理科 / 工程 / 商科常见，可与数学一起加权', '#16a34a')}
  ${row(790, '② 数学 或 M1/M2 二选一', '哪科分高就用哪科', '#2563eb')}
  ${row(960, '③ 只当普通选修', '部分专业甚至不计——一定要逐科看', '#dc2626')}
  ${hi(1090, ['⚠️ 值不值钱，完全取决于', '你填的那个专业怎么算'])}
  ${brand(true)}`);

/* ── 第 3 張：工具 + CTA + 反馈 ── */
await save('m1m2_3_tool', `
  ${shadow}
  <rect width="${W}" height="${H}" fill="#f4f7fb"/>
  ${chip(70, 96, '🔥 懒得逐个查？', ACC, '#fff')}
  <text x="70" y="300" font-family='${F}' font-size="90" font-weight="800" fill="${ACC}">一键帮你</text>
  <text x="70" y="400" font-family='${F}' font-size="90" font-weight="800" fill="${ACC}">算清楚</text>
  <g filter="url(#sh)"><rect x="70" y="490" width="940" height="470" rx="34" fill="#ffffff"/></g>
  ${row(600, '输入 M1/M2 成绩', '按每个专业的计分法自动帮你算')}
  ${row(748, '立刻看到帮不帮得上', 'M1/M2 在这专业到底值不值钱')}
  ${row(896, '再对比收生中位数', '中英文、手机可用、免登录')}
  ${hi(1010, ['👉 JUPAS Calculator 免费查', 'dsemarks.com（链接在主页）'])}
  <text x="${W / 2}" y="1235" font-family='${F}' font-size="27" fill="#94a3b8" text-anchor="middle">📮 数据不准？feedback@dsemarks.com</text>
  ${brand(true)}`);

console.log('完成：M1/M2 这篇的 3 张图已生成');
