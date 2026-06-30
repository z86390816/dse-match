// 讀取 PolyU 各專業官方「科目加權」PDF（每專業一個單獨連結），
// 解析每科權重 → 設定 best5 + 加權 + standard 換分（5**=7…），重算 PolyU 分數。
// 來源：https://www.polyu.edu.hk/aradm/jupas/2025_{JScode}_SW.pdf
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

// PolyU PDF 科目名 → 引擎 subject id（長名先比，避免 'Mathematics' 誤吃 'Mathematics (Extended…)'）
const NAME2ID = [
  ['Mathematics (Extended part - Algebra and Calculus)', 'm2'],
  ['Mathematics (Extended part - Calculus and Statistics)', 'm1'],
  ['Business, Accounting and Financial Studies (Business Management)', 'bafs'],
  ['Business, Accounting and Financial Studies (Accounting)', 'bafs'],
  ['Business, Accounting and Financial Studies', 'bafs'],
  ['Combined Science: Biology + Chemistry', 'cit'],
  ['Combined Science: Biology + Physics', 'cit'],
  ['Combined Science: Physics + Chemistry', 'cit'],
  ['Integrated Science', 'ist'],
  ['Health Management and Social Care', 'hmsc'],
  ['Information and Communication Technology', 'ict'],
  ['Design and Applied Technology', 'dat'],
  ['Technology and Living (Fashion, Clothing and Textiles)', 'tl'],
  ['Technology and Living (Food Science and Technology)', 'tl'],
  ['Tourism and Hospitality Studies', 'ths'],
  ['Ethics and Religious Studies', 'ethics'],
  ['Literature in English', 'englit'],
  ['Chinese Literature', 'chlit'],
  ['Chinese History', 'chist'],
  ['Chinese Language', 'chin'],
  ['English Language', 'eng'],
  ['Mathematics', 'math'],
  ['Economics', 'econ'],
  ['Geography', 'geog'],
  ['History', 'hist'],
  ['Biology', 'bio'],
  ['Chemistry', 'chem'],
  ['Physics', 'phys'],
  ['Visual Arts', 'va'],
  ['Music', 'music'],
  ['Physical Education', 'pe'],
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function pdfText(buf) {
  const doc = await getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const tc = await (await doc.getPage(1)).getTextContent();
  return tc.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ');
}

function parseWeights(text) {
  // 只取 Category A（Core and Elective Subjects）段，避免 Cat C 其他語言
  const a = text.indexOf('Category A');
  const cEnd = text.indexOf('Category C');
  let seg = a >= 0 ? text.slice(a, cEnd > a ? cEnd : undefined) : text;
  const weights = {};
  for (const [name, id] of NAME2ID) {
    const m = seg.match(new RegExp(esc(name) + '\\s+(\\d{1,2})(?=\\s)'));
    if (m) {
      const w = +m[1];
      // 同一 id（如 cit 三變體、bafs 變體）取最大權重
      if (weights[id] == null || w > weights[id]) weights[id] = w;
      seg = seg.replace(m[0], ' '.repeat(m[0].length)); // 消耗，避免短名重配
    }
  }
  return weights;
}

const PROG_PATH = path.resolve('../backend/src/data/programmes.json');
const prog = JSON.parse(fs.readFileSync(PROG_PATH, 'utf8'));
const polyu = prog.programmes.filter((p) => p.universityId === 'polyu');
const STD = { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0, comparable = 0;

for (const p of polyu) {
  const url = `https://www.polyu.edu.hk/aradm/jupas/2025_${p.jupasCode}_SW.pdf`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { fail++; process.stdout.write('x'); continue; }
    const text = await pdfText(await res.arrayBuffer());
    const weights = parseWeights(text);
    if (Object.keys(weights).length < 3) { fail++; process.stdout.write('?'); continue; }

    p.method = 'best5';
    p.weights = weights;
    p.gradeScheme = 'standard';
    p.weightsStatus = 'official-polyu';

    // 重算 scoreComparable：完美生（best5 取最大 5 個權重 ×7）≥ median 才可精確比對
    const topW = Object.values(weights).sort((a, b) => b - a).slice(0, 5);
    const perfect = topW.reduce((s, w) => s + w * STD['5**'], 0);
    const med = p.admission?.median;
    p.scoreComparable = med == null ? false : perfect >= med;
    if (p.scoreComparable) { comparable++; delete p.scaleNote; }
    ok++;
    process.stdout.write('.');
  } catch (e) { fail++; process.stdout.write('!'); }
  await sleep(120);
}

fs.writeFileSync(PROG_PATH, JSON.stringify(prog, null, 2));
console.log(`\nPolyU 權重：${ok} 個成功 / ${fail} 失敗；可精確比對 ${comparable} 個`);
