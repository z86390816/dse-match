// 從 JUPAS PDF 的 CUHK 區塊重新解析「• 科目 (x N.N)」加權清單（權威格式），
// 修正 programmes.json 內 CUHK 各專業的 weights / method，並重算 scoreComparable。
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

const doc = await getDocument({ data: new Uint8Array(fs.readFileSync('jupas_all_2025.pdf')), verbosity: 0 }).promise;
let text = '';
for (let p = 18; p <= 22; p++) { const tc = await (await doc.getPage(p)).getTextContent(); text += ' ' + tc.items.map((i) => i.str).join(' '); }
text = text.replace(/\s+/g, ' ');

// 科目關鍵字 → id（長名先）
const SUBJ = [
  [/Chinese History/i, ['chist']], [/Chinese Literature/i, ['chlit']], [/Literature in English/i, ['englit']],
  [/M1\s*(?:or|\/)\s*M2|M1\/M2|\bM1\b|\bM2\b/i, ['m1', 'm2']],
  [/Mathematics/i, ['math']], [/English/i, ['eng']], [/Chinese/i, ['chin']],
  [/Biology/i, ['bio']], [/Chemistry/i, ['chem']], [/Physics/i, ['phys']],
  [/Economics/i, ['econ']], [/BAFS|Business, Accounting/i, ['bafs']],
  [/Information and Communication|ICT/i, ['ict']], [/Design and Applied|DAT/i, ['dat']],
  [/Geography/i, ['geog']], [/History/i, ['hist']],
  [/Combined Science/i, ['cit']], [/Integrated Science/i, ['ist']],
  [/Visual Arts/i, ['va']], [/Music/i, ['music']], [/Physical Education/i, ['pe']],
  [/Ethics/i, ['ethics']], [/Health Management/i, ['hmsc']], [/Technology and Living/i, ['tl']], [/Tourism/i, ['ths']],
];
function idsInPhrase(phrase) {
  const out = new Set();
  for (const [re, ids] of SUBJ) if (re.test(phrase)) ids.forEach((i) => out.add(i));
  return [...out];
}

// 切成各專業區塊
const blocks = text.split(/(?=JS[45]\d{3})/).filter((b) => /^JS[45]\d{3}/.test(b));
const parsed = {}; // code → { bestN, weights }
for (const b of blocks) {
  const code = b.match(/^(JS\d{4})/)[1];
  const bestN = +(b.match(/Best\s+(\d)/) || [, 5])[1];
  // 只取 "Best N" 之後、下一個 JS code 之前的加權文字
  const seg = b.slice(b.search(/Best\s+\d/));
  const weights = {};
  for (const m of seg.matchAll(/•\s*([^•(]+?)\s*\(\s*x\s*([\d.]+)\s*\)/g)) {
    const phrase = m[1], w = +m[2];
    for (const id of idsInPhrase(phrase)) if (weights[id] == null || w > weights[id]) weights[id] = w;
  }
  parsed[code] = { bestN, weights };
}

// 寫回 programmes.json
const PROG = path.resolve('../backend/src/data/programmes.json');
const json = JSON.parse(fs.readFileSync(PROG, 'utf8'));
const STD = { bonusTop: 8.5, standard: 7 };
let fixed = 0, comparable = 0;
for (const p of json.programmes) {
  if (p.universityId !== 'cuhk') continue;
  if (['JS4501', 'JS4502'].includes(p.jupasCode)) continue; // 醫科特殊公式，維持不變
  const info = parsed[p.jupasCode];
  if (!info) continue;
  p.method = info.bestN === 6 ? 'best6' : 'best5';
  p.weights = info.weights;
  p.gradeScheme = 'bonusTop';
  p.weightsStatus = 'official-cuhk';
  // 完美生：取最高 N 個加權 × 8.5（其餘科權重 1）
  const pool = [...Object.values(info.weights), 1, 1, 1, 1, 1, 1].sort((a, b) => b - a).slice(0, info.bestN);
  const perfect = STD.bonusTop * pool.reduce((s, w) => s + w, 0);
  const med = p.admission?.median;
  p.scoreComparable = med == null ? false : perfect >= med;
  if (p.scoreComparable) { comparable++; delete p.scaleNote; }
  fixed++;
}
fs.writeFileSync(PROG, JSON.stringify(json, null, 2));
console.log(`CUHK 修正：${fixed} 個專業重設加權；可精確比對 ${comparable} 個`);
console.log('JS4412 →', JSON.stringify(parsed['JS4412']));
console.log('JS4416 →', JSON.stringify(parsed['JS4416']));
