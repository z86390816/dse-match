// 生成 Open Graph 分享圖（1200×630 PNG）→ frontend/public/og-image.png
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const W = 1200, H = 630;
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="0.55" stop-color="#2563eb"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.1" r="0.6">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eaf1ff"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- 左側文字 -->
  <g font-family="Arial, Helvetica, sans-serif">
    <rect x="80" y="86" width="232" height="44" rx="22" fill="#ffffff" fill-opacity="0.16"/>
    <text x="104" y="116" font-size="22" font-weight="700" fill="#ffffff" letter-spacing="2">DSE · JUPAS · 2025</text>

    <text x="78" y="248" font-size="92" font-weight="800" fill="#ffffff" letter-spacing="-2">JUPAS</text>
    <text x="78" y="344" font-size="92" font-weight="800" fill="#bfdbfe" letter-spacing="-2">Calculator</text>

    <text x="82" y="408" font-size="30" font-weight="500" fill="#e0ecff">Match your HKDSE results to 2025</text>
    <text x="82" y="448" font-size="30" font-weight="500" fill="#e0ecff">university admission scores.</text>

    <!-- 統計 pill -->
    <g>
      <rect x="80" y="500" width="186" height="58" rx="14" fill="#ffffff" fill-opacity="0.14"/>
      <text x="173" y="538" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">9 institutions</text>
      <rect x="282" y="500" width="196" height="58" rx="14" fill="#ffffff" fill-opacity="0.14"/>
      <text x="380" y="538" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">349 programmes</text>
      <rect x="494" y="500" width="206" height="58" rx="14" fill="#ffffff" fill-opacity="0.14"/>
      <text x="597" y="538" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">official 2025 data</text>
    </g>
  </g>

  <!-- 右側模擬結果卡 -->
  <g font-family="Arial, Helvetica, sans-serif">
    <rect x="812" y="150" width="316" height="330" rx="24" fill="url(#card)"/>
    <rect x="812" y="150" width="316" height="330" rx="24" fill="none" stroke="#ffffff" stroke-opacity="0.5"/>
    <rect x="836" y="178" width="120" height="34" rx="17" fill="#dcfce7"/>
    <text x="896" y="201" font-size="19" font-weight="800" fill="#166534" text-anchor="middle">SAFE</text>
    <text x="836" y="262" font-size="22" font-weight="700" fill="#0f1b2d">Your Score</text>
    <text x="836" y="318" font-size="64" font-weight="800" fill="#2563eb">27.5</text>
    <line x1="836" y1="350" x2="1104" y2="350" stroke="#e3e9f0" stroke-width="2"/>
    <text x="836" y="392" font-size="22" fill="#5b6b80">Median</text>
    <text x="1104" y="392" font-size="22" font-weight="700" fill="#0f1b2d" text-anchor="end">24</text>
    <text x="836" y="436" font-size="22" fill="#5b6b80">2025 Admitted</text>
    <text x="1104" y="436" font-size="22" font-weight="700" fill="#ea580c" text-anchor="end">19</text>
  </g>

  <!-- 網址 -->
  <text x="1120" y="592" font-size="24" font-weight="700" fill="#ffffff" fill-opacity="0.9" text-anchor="end" font-family="Arial, Helvetica, sans-serif">dsemarks.com</text>
</svg>`;

const outDir = path.resolve('../frontend/public');
fs.mkdirSync(outDir, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, 'og-image.png'));
console.log('已生成 frontend/public/og-image.png (1200×630)');
