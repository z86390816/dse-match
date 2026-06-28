// 驗證引擎與數據：遍歷大量分數組合 + 抽查官方值 + 不變量檢查。
// 用法：node verify.mjs   （需先 npm install 在 backend，或直接相對引用）
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend', 'src');
const { calculateScore } = require(path.join(root, 'services', 'scoreCalculator.js'));
const { matchAll } = require(path.join(root, 'services', 'matcher.js'));
const { UNIVERSITY_MAP } = require(path.join(root, 'data', 'universities.js'));
const data = require(path.join(root, 'data', 'programmes.json'));
const PROGRAMMES = data.programmes;

const GRADES = ['5**', '5*', '5', '4', '3', '2', '1'];
const ELECTIVES = ['phys', 'chem', 'bio', 'econ', 'bafs', 'geog', 'hist', 'ict', 'm1', 'm2'];
let fails = 0, warns = 0;
const fail = (m) => { console.log('  ❌', m); fails++; };
const warn = (m) => { console.log('  ⚠️ ', m); warns++; };

// 隨機成績產生器
function randGrades() {
  const g = { csd: '達標' };
  for (const c of ['chin', 'eng', 'math']) g[c] = GRADES[Math.floor(Math.random() * GRADES.length)];
  const n = 2 + Math.floor(Math.random() * 3);
  const picks = [...ELECTIVES].sort(() => Math.random() - 0.5).slice(0, n);
  for (const e of picks) g[e] = GRADES[Math.floor(Math.random() * GRADES.length)];
  return g;
}
// 成績「全面 ≥」另一份
function dominates(a, b) {
  const idx = (x) => GRADES.indexOf(x);
  for (const k of Object.keys(b)) { if (k === 'csd') continue; if (!a[k]) return false; if (idx(a[k]) > idx(b[k])) return false; }
  return true;
}

console.log('=== 1. 數據完整性 ===');
const idSeen = new Set();
for (const p of PROGRAMMES) {
  if (idSeen.has(p.id)) fail(`重複 id: ${p.id}`);
  idSeen.add(p.id);
}
for (const p of PROGRAMMES) {
  const { median, lowerQuartile } = p.admission;
  if (median == null) fail(`${p.jupasCode} 無 median`);
  if (lowerQuartile != null && median != null && lowerQuartile > median + 0.01) fail(`${p.jupasCode} LQ(${lowerQuartile}) > median(${median})`);
  if (p.scoreComparable !== false && (median > 60 || median < 8)) warn(`${p.jupasCode} median ${median} 超出常理範圍(可比較校)`);
}
console.log(`  專業 ${PROGRAMMES.length} 筆，median/LQ 一致性檢查完成`);

console.log('\n=== 2. 官方值抽查（對照 PDF 人工讀數）===');
const KNOWN = {
  'JS1211': [39, 38], 'JS1807': [45.5, 43], 'JS1001': [29.5, 28],          // CityU
  'JS4018': [30.4, 29.2], 'JS4032': [27.25, 26.5], 'JS4068': [24.5, 23],   // CUHK
  'JS5101': [38.25, 37.88], 'JS5102': [33.13, 32.63],                       // HKUST
  'JS6793': [35, 34], 'JS6808': [46, 45], 'JS6884': [51, 50],               // HKU
  'JS3320': [223, 210],                                                     // PolyU
  'JS9011': [22, 21],                                                       // HKMU
};
// 只驗 median（LQ 可能無）
const KNOWN_MEDIAN = { 'JS2025': 21, 'JS7204': 27.05 };                     // HKBU, Lingnan
for (const [code, [m, l]] of Object.entries(KNOWN)) {
  const p = PROGRAMMES.find((x) => x.jupasCode === code);
  if (!p) { fail(`抽查 ${code} 不存在`); continue; }
  if (p.admission.median !== m || p.admission.lowerQuartile !== l) fail(`${code} 期望 ${m}/${l}，實際 ${p.admission.median}/${p.admission.lowerQuartile}`);
}
for (const [code, m] of Object.entries(KNOWN_MEDIAN)) {
  const p = PROGRAMMES.find((x) => x.jupasCode === code);
  if (!p) { fail(`抽查 ${code} 不存在`); continue; }
  if (p.admission.median !== m) fail(`${code} median 期望 ${m}，實際 ${p.admission.median}`);
}
if (fails === 0) console.log('  全部官方抽查值正確 ✓');

console.log('\n=== 3. 單調性：成績越好，分數不應變低（每專業，500 組隨機對照）===');
let monoChecks = 0;
for (let i = 0; i < 500; i++) {
  const g1 = randGrades();
  const g2 = { ...g1 };
  // g2 把某科提升一級
  const keys = Object.keys(g1).filter((k) => k !== 'csd' && GRADES.indexOf(g1[k]) > 0);
  if (!keys.length) continue;
  const k = keys[Math.floor(Math.random() * keys.length)];
  g2[k] = GRADES[GRADES.indexOf(g1[k]) - 1]; // 升一級
  for (const p of PROGRAMMES) {
    const uni = UNIVERSITY_MAP[p.universityId];
    const s1 = calculateScore(g1, p, uni).score;
    const s2 = calculateScore(g2, p, uni).score;
    monoChecks++;
    if (s2 < s1 - 0.001) fail(`${p.jupasCode} 升 ${k} (${g1[k]}→${g2[k]}) 後分數反降 ${s1}→${s2}`);
  }
}
console.log(`  單調性檢查 ${monoChecks} 次完成`);

console.log('\n=== 4. 分數範圍合理性（完美生 vs 最弱生）===');
const perfect = { chin: '5**', eng: '5**', math: '5**', csd: '達標', phys: '5**', chem: '5**', bio: '5**', m2: '5**', econ: '5**' };
const weak = { chin: '2', eng: '2', math: '2', csd: '達標', phys: '1', chem: '1', econ: '1' };
for (const p of PROGRAMMES) {
  if (p.scoreComparable === false) continue;
  const uni = UNIVERSITY_MAP[p.universityId];
  const hi = calculateScore(perfect, p, uni).score;
  const lo = calculateScore(weak, p, uni).score;
  if (lo > hi) fail(`${p.jupasCode} 弱生(${lo}) > 完美生(${hi})`);
  // 完美生分數理論上限：HKU 線性公式可達 ~70（1.5E+1.5M+best5+0.2tail），其餘 best5/6 ≤51；超 75 才示警
  if (hi > 75) warn(`${p.jupasCode} 完美生分數 ${hi} 偏高（疑加權異常）method=${p.method} w=${JSON.stringify(p.weights)}`);
  // 完美生應該對絕大多數專業 "safe"
  if (hi < p.admission.median) warn(`${p.jupasCode} 完美生分數 ${hi} < median ${p.admission.median}（疑尺度不符）`);
}

console.log('\n=== 5. 完美生整體 tier 分佈（應幾乎全 safe / reference）===');
const res = matchAll(perfect, PROGRAMMES);
const dist = {};
res.forEach((r) => dist[r.tier] = (dist[r.tier] || 0) + 1);
console.log('  ', JSON.stringify(dist));
const weakRes = matchAll(weak, PROGRAMMES);
const wdist = {};
weakRes.forEach((r) => wdist[r.tier] = (wdist[r.tier] || 0) + 1);
console.log('   弱生:', JSON.stringify(wdist));

console.log(`\n=== 結果：${fails} 個錯誤，${warns} 個警告 ===`);
process.exit(fails > 0 ? 1 : 0);
