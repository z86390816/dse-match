// 匯入某一年的官方收生分數，併入多年份結構並自動計算「與上一年的變化」。
//
// 用法：
//   node import_admission_year.mjs 2026 scores_2026.json
//   node import_admission_year.mjs 2026 scores_2026.csv
//   node import_admission_year.mjs 2026 scores_2026.csv --mark-missing-discontinued
//   node import_admission_year.mjs 2026 scores_2026.csv --source="JUPAS 官方 2026 收生分數 (af_2026_JUPAS.pdf)"
//
// 輸入格式（JSON 陣列，或同欄位的 CSV，需有標題列）：
//   [{ "jupasCode":"JS1211", "median":39, "lowerQuartile":38, "upperQuartile":41,
//      "universityId":"cityu", "formulaChanged":false }, ...]
//   universityId / upperQuartile / formulaChanged 可省略。
//   formulaChanged=true 代表該課程今年計分公式有變 → 逐年差值標為不可比。
//
// 這支腳本只動「分數」，不會改計分公式；公式若有變動請另行更新 weights/method/gradeScheme。
import fs from 'fs';
import path from 'path';

const [yearArg, fileArg, ...flags] = process.argv.slice(2);
if (!yearArg || !fileArg) {
  console.error('用法：node import_admission_year.mjs <年份> <scores.json|scores.csv> [--mark-missing-discontinued]');
  process.exit(1);
}
const YEAR = String(Number(yearArg));
if (YEAR === 'NaN') { console.error('年份必須是數字，例：2026'); process.exit(1); }
const MARK_MISSING = flags.includes('--mark-missing-discontinued');
const SOURCE = (flags.find((f) => f.startsWith('--source=')) || '').slice('--source='.length) || null;

const FILE = path.resolve('../backend/src/data/programmes.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
if (!data.programmes[0]?.admissionByYear) {
  console.error('programmes.json 尚未遷移成多年份結構，請先執行：node migrate_multiyear.mjs');
  process.exit(1);
}

// --- 讀取輸入 ---
const raw = fs.readFileSync(path.resolve(fileArg), 'utf-8');
let records;
if (fileArg.toLowerCase().endsWith('.csv')) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(',').map((h) => h.trim());
  records = lines.map((l) => {
    const cells = l.split(',').map((c) => c.trim());
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
  });
} else {
  const parsed = JSON.parse(raw);
  records = Array.isArray(parsed) ? parsed : parsed.programmes;
}

const num = (v) => (v === '' || v == null || v === '-' || v === 'null' ? null : Number(v));
const truthy = (v) => v === true || v === 'true' || v === '1';

// --- 建索引（uni+code 優先，其次單靠 code）---
const byUniCode = new Map(), byCode = new Map();
for (const p of data.programmes) {
  byUniCode.set(`${p.universityId}|${p.jupasCode.toUpperCase()}`, p);
  const k = p.jupasCode.toUpperCase();
  if (byCode.has(k)) byCode.set(k, null); // JS code 撞名 → 不可單靠 code 對應
  else byCode.set(k, p);
}

const prevYearOf = (p) =>
  Object.keys(p.admissionByYear)
    .map(Number)
    .filter((y) => y < Number(YEAR))
    .sort((a, b) => b - a)[0] ?? null;

const diff = (a, b) => (a == null || b == null ? null : +(a - b).toFixed(2));

let updated = 0; const unmatched = [], ambiguous = [];
const touched = new Set();

for (const r of records) {
  const code = String(r.jupasCode || r.code || '').toUpperCase().trim();
  if (!code) continue;
  const uni = (r.universityId || r.uni || '').toLowerCase().trim();
  let p = uni ? byUniCode.get(`${uni}|${code}`) : byCode.get(code);
  if (p === null) { ambiguous.push(code); continue; }   // code 撞名又沒給 universityId
  if (!p) { unmatched.push(code); continue; }

  const scores = {
    median: num(r.median),
    lowerQuartile: num(r.lowerQuartile ?? r.lq),
  };
  const uq = num(r.upperQuartile ?? r.uq);
  if (uq != null) scores.upperQuartile = uq;
  if (scores.median == null && scores.lowerQuartile == null) { unmatched.push(`${code}(無分數)`); continue; }

  p.admissionByYear[YEAR] = scores;
  p.admissionYear = Number(YEAR);
  p.admission = { ...scores };                       // 別名指向最新年份

  const prevY = prevYearOf(p);
  const prev = prevY != null ? p.admissionByYear[String(prevY)] : null;
  p.admissionDelta = prev
    ? {
        vsYear: prevY,
        median: diff(scores.median, prev.median),
        lowerQuartile: diff(scores.lowerQuartile, prev.lowerQuartile),
        // 官方明言分數不可跨年比較；公式有變時更不可比。
        comparable: !truthy(r.formulaChanged),
      }
    : null;
  if (p.admissionDelta == null) p.isNewThisYear = true;
  else delete p.isNewThisYear;

  // dataStatus 內嵌年份（official-2025 / official-2025-noformula），一併更新避免標錯來源年份
  if (typeof p.dataStatus === 'string') p.dataStatus = p.dataStatus.replace(/20\d{2}/, YEAR);

  touched.add(p.id);
  updated++;
}

// --- 今年官方名單中消失的課程 ---
const missing = data.programmes.filter((p) => !touched.has(p.id));
if (MARK_MISSING) for (const p of missing) p.discontinuedSince = Number(YEAR);

data.previousYear = data.year === Number(YEAR) ? data.previousYear : data.year;
data.year = Number(YEAR);
// source/dataNote 帶年份，換年後必須一起更新，否則頁面會標錯資料來源年份
data.source = SOURCE || `JUPAS 官方 ${YEAR} 收生分數 (af_${YEAR}_JUPAS.pdf) — 全 9 所院校`;
if (typeof data.dataNote === 'string') {
  data.dataNote = data.dataNote.replace(/20\d{2}/g, String(YEAR));
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 1));

console.log(`已匯入 ${YEAR} 年收生分數：${updated} 個專業`);
console.log(`未在本站資料庫找到（需新增課程記錄）：${unmatched.length}` + (unmatched.length ? ` → ${unmatched.slice(0, 20).join(', ')}${unmatched.length > 20 ? ' …' : ''}` : ''));
if (ambiguous.length) console.log(`JS code 撞名、需在輸入補 universityId：${ambiguous.length} → ${ambiguous.join(', ')}`);
console.log(`${YEAR} 名單中沒有、仍留用上一年數據的專業：${missing.length}` + (MARK_MISSING ? '（已標 discontinuedSince）' : '（未標記，加 --mark-missing-discontinued 可標）'));
console.log('下一步：node verify.mjs && node sync_frontend.mjs');
