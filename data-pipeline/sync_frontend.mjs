// 把後端靜態資料同步到前端（前端已全靜態、無後端）。
// 每次重新生成 programmes/disciplines/applications 後執行：node sync_frontend.mjs
import fs from 'fs';
import path from 'path';

const B = path.resolve('../backend/src/data');
const F = path.resolve('../frontend/src/data');
const PUB = path.resolve('../frontend/public');

fs.mkdirSync(F, { recursive: true });
fs.copyFileSync(path.join(B, 'programmes.json'), path.join(F, 'programmes.json'));

// 另外抽出一份極小的 meta（年份／上一年／年度說明），讓 i18n 等模組可同步 import，
// 不必為了拿年份而把整份 programmes.json 打進主 bundle。
const meta = JSON.parse(fs.readFileSync(path.join(B, 'programmes.json'), 'utf-8'));
fs.writeFileSync(
  path.join(F, 'meta.json'),
  JSON.stringify({ year: meta.year, previousYear: meta.previousYear ?? null, yearNote: meta.yearNote ?? null, source: meta.source }, null, 2)
);
// disciplines.json 不可直接覆蓋：merge_analysis.mjs 只把 nowZh/nowEn/futureZh/futureEn
// 寫進前端那一份，後端沒有這些欄位，硬 copy 會把深度分析洗掉。改為逐條合併、
// 後端欄位優先，前端獨有欄位保留。
{
  const src = JSON.parse(fs.readFileSync(path.join(B, 'disciplines.json'), 'utf-8'));
  const dstPath = path.join(F, 'disciplines.json');
  const dst = fs.existsSync(dstPath) ? JSON.parse(fs.readFileSync(dstPath, 'utf-8')) : {};
  let kept = 0;
  const merged = {};
  for (const [k, v] of Object.entries(src)) {
    const prev = dst[k] || {};
    const extra = Object.keys(prev).filter((f) => !(f in v));
    kept += extra.length;
    merged[k] = { ...prev, ...v };
  }
  // 前端有、後端已移除的 discipline 一併保留，避免靜默掉資料
  for (const [k, v] of Object.entries(dst)) if (!merged[k]) merged[k] = v;
  fs.writeFileSync(dstPath, JSON.stringify(merged, null, 1));
  console.log(`disciplines.json 已合併（保留前端獨有欄位 ${kept} 個）`);
}
fs.copyFileSync(path.join(B, 'applications.json'), path.join(PUB, 'applications.json'));

console.log('已同步 programmes.json、disciplines.json、meta.json → frontend/src/data；applications.json → frontend/public');
console.log('注意：subjects.js 與 universities.js 為手寫，更新後請同步 frontend/src/engine/ 對應檔。');
