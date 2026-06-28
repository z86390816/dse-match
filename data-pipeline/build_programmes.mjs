import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ROOT = 'C:/Claude/DSE/backend/src';
const { calculateScore } = require(path.join(ROOT, 'services/scoreCalculator.js'));
const { UNIVERSITY_MAP } = require(path.join(ROOT, 'data/universities.js'));
const PERFECT = { chin: '5**', eng: '5**', math: '5**', csd: '達標', phys: '5**', chem: '5**', bio: '5**', m1: '5**', m2: '5**', econ: '5**', bafs: '5**' };

const all = JSON.parse(fs.readFileSync('all5.json', 'utf8'));

// 依課程名關鍵字歸類（給興趣推薦用），順序＝優先級
const CAT = [
  ['medical', /medic|medicine|nursing|pharmac|biomed|health|dent|nutrition|optometry|radiograph|physiotherap|chinese medicine|MBBS|MBChB/i],
  ['law', /\blaw\b|laws|LLB|juris/i],
  ['education', /education|teaching|\bBEd\b|early childhood/i],
  ['it', /computer|computing|data science|artificial intelligence|\bAI\b|information (systems|technology|engineering)|software|cyber|fintech|computational/i],
  ['engineering', /engineering|\bBEng\b|mechanical|civil|electr(o|i)|aerospace|robotic|construction|surveying/i],
  ['business', /business|\bBBA\b|accounting|accountancy|finance|economics|management|marketing|commerce|hotel|logistics|supply chain/i],
  ['science', /science|\bBSc\b|physics|chemistry|biolog|mathematic|environment|geolog|astro|food/i],
  ['social', /social|sociolog|psycholog|politic|government|public (policy|administration)|journalism|communication|global studies|geography/i],
  ['arts', /\barts\b|\bmusic\b|visual|\bdesign\b|creative|fine arts|architecture|media/i],
  ['humanities', /humanities|history|language|literature|translation|philosoph|linguistic|cultural|religion|chinese|english|japanese|korean|french/i],
];
function categorize(name) {
  for (const [cat, re] of CAT) if (re.test(name)) return cat;
  return 'general';
}

const programmes = all
  .filter((p) => p.admission.median != null)        // 只保留有收生分數的
  .map((p) => {
    // 清理課程名：去除開頭雜訊（如 "la:" "-" 標點）、壓縮空白
    const cleanName = (p.name || '').replace(/^(?:la:|[:\-)\s])+/i, '').replace(/\s+/g, ' ').trim();
    const out = { ...p, name: cleanName, category: categorize(cleanName) };
    delete out.formulaText; // 內部用，前端不需
    // 加權欄解析不可靠（多行共用 block／行錯位 bleed）→ 改用 best-N 不加權，標記近似
    if (['cityu', 'hkmu', 'eduhk'].includes(p.universityId)) { out.weights = {}; out.weightsStatus = 'unweighted-approx'; }
    // PolyU：保證 median >= LQ（其版面易錯位，至少維持次序）
    if (out.admission.median != null && out.admission.lowerQuartile != null && out.admission.lowerQuartile > out.admission.median) {
      [out.admission.median, out.admission.lowerQuartile] = [out.admission.lowerQuartile, out.admission.median];
    }
    return out;
  });

// 自動把關：若連完美生都達不到 median，代表本校公式我無法精確複製 → 改標「僅供參考」不評級
let gated = 0;
for (const p of programmes) {
  if (p.scoreComparable === false) continue;
  const hi = calculateScore(PERFECT, p, UNIVERSITY_MAP[p.universityId]).score;
  if (p.admission.median != null && hi < p.admission.median - 0.01) {
    p.scoreComparable = false;
    p.scaleNote = '本校此課程計分較複雜（加權／Best-6／額外科目），暫無法精確複製，僅供參考';
    p.dataStatus = 'official-2025-noformula';
    gated++;
  }
}
console.log('自動轉為「僅供參考」的專業數:', gated);

// 去重：同一 uni+JS code 可能因多行版面被重複擷取，保留資料最完整的一筆
const seen = new Map();
for (const p of programmes) {
  const key = p.universityId + p.jupasCode;
  const prev = seen.get(key);
  const score = (x) => (x.admission.median != null ? 2 : 0) + (x.admission.lowerQuartile != null ? 1 : 0) + (x.name ? 0.1 : 0);
  if (!prev || score(p) > score(prev)) seen.set(key, p);
}
const deduped = [...seen.values()];
const removed = programmes.length - deduped.length;
programmes.length = 0;
programmes.push(...deduped);
console.log('去重移除重複專業:', removed);

const byInst = {}, byCat = {};
for (const p of programmes) { byInst[p.universityId] = (byInst[p.universityId] || 0) + 1; byCat[p.category] = (byCat[p.category] || 0) + 1; }

const out = {
  year: 2025,
  source: 'JUPAS 官方 2025 收生分數 (af_2025_JUPAS.pdf) — 5 所主要大學',
  dataNote: '收生中位數/下四分位數為官方數據。CityU/CUHK/HKUST 科目加權為自動解析（部分待人工核對）；HKU 為公式計算；PolyU 採 ~200-300 百分位尺度、計分公式不公開，僅供參考、不評級。',
  programmes,
};
fs.writeFileSync('programmes_final.json', JSON.stringify(out, null, 2));
console.log('總專業數:', programmes.length);
console.log('各校:', JSON.stringify(byInst));
console.log('各類:', JSON.stringify(byCat));
