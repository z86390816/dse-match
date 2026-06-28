// CityU 專屬解析（pages 2-8）→ 引擎格式 programmes
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const data = new Uint8Array(fs.readFileSync('jupas_all_2025.pdf'));
const doc = await getDocument({ data, verbosity: 0 }).promise;

const SUBJ = [
  [/Chinese History/i, 'chist'], [/Chinese/i, 'chin'], [/English/i, 'eng'],
  [/Mathematics|Maths/i, 'math'], [/M1\/M2|M1\/ M2/i, 'm1m2'],
  [/Biology/i, 'bio'], [/Chemistry/i, 'chem'], [/Physics/i, 'phys'],
  [/Economics/i, 'econ'], [/Business, Accounting/i, 'bafs'],
  [/Information and\s*Communication|ICT/i, 'ict'], [/Geography/i, 'geog'],
  [/History/i, 'hist'], [/Visual Arts/i, 'va'],
];
function mapSubjects(text) {
  const out = new Set();
  for (const [re, id] of SUBJ) if (re.test(text)) out.add(id);
  return [...out];
}

const isNum = (s) => /^\d+(\.\d+)?$/.test(s);
function rows(items) {
  const rs = [];
  for (const it of items.sort((a, b) => a.y - b.y || a.x - b.x)) {
    let r = rs.find((x) => Math.abs(x.y - it.y) < 3);
    if (!r) { r = { y: it.y, items: [] }; rs.push(r); }
    r.items.push(it);
  }
  rs.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  return rs.sort((a, b) => a.y - b.y);
}
// 合併左欄被拆開的 JS code
function findCode(r) {
  const left = r.items.filter((i) => i.x < 120).sort((a, b) => a.x - b.x);
  let s = '';
  for (const it of left) {
    const t = it.str.replace(/\s/g, '');
    if (s === '' && /^JS\d*$/.test(t)) s = t;
    else if (s && /^\d+$/.test(t) && it.x < left[0].x + 70) s += t;
    if (/^JS\d{4}$/.test(s)) return { code: s, x: left[0].x };
  }
  return /^JS\d{4}$/.test(s) ? { code: s, x: left[0]?.x ?? 55 } : null;
}

const out = [];
for (let p = 2; p <= 8; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = tc.items.filter((i) => i.str.trim())
    .map((i) => ({ str: i.str.trim(), x: +i.transform[4].toFixed(1), y: +(vp.height - i.transform[5]).toFixed(1) }));
  const rs = rows(items);

  // anchors
  const anchors = [];
  for (const r of rs) { const c = findCode(r); if (c) anchors.push({ ...c, y: r.y }); }
  anchors.sort((a, b) => a.y - b.y);

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const yEnd = i + 1 < anchors.length ? anchors[i + 1].y : 9999;
    const inRange = (y) => y >= a.y - 2 && y < yEnd;
    const title = [], method = [], weight = [];
    let median = null, lower = null;
    for (const r of rs) {
      // 分數只在 anchor 自己的 y 範圍；公式欄略往上偏移，放寬上界抓加權文字
      const inScore = r.y >= a.y - 2 && r.y < yEnd;
      const inFormula = r.y >= a.y - 12 && r.y < yEnd - 2;
      for (const it of r.items) {
        const c = it.x;
        if (inScore) {
          if (c >= 440 && c < 493 && isNum(it.str)) { const v = +it.str; if (v >= 12 && v <= 70 && median == null) median = v; }
          else if (c >= 493 && c < 545 && isNum(it.str)) { const v = +it.str; if (v >= 12 && v <= 70 && lower == null) lower = v; }
        }
        if (c < 225) { if (inScore && !/^JS\d/.test(it.str.replace(/\s/g, ''))) title.push(it.str); }
        else if (inFormula && c >= 225 && c < 318) method.push(it.str);
        else if (inFormula && c >= 318 && c < 448) weight.push(it.str);
      }
    }
    const methodText = method.join(' ').replace(/\s+/g, ' ').trim();
    const weightText = weight.join(' ').replace(/\s+/g, ' ').trim();
    // method
    let m = 'best5';
    if (/Best 6|6 subjects/i.test(methodText)) m = 'best6';
    // weights：解析 "N: subjlist" 群組
    const weights = {};
    const re = /(\d+(?:\.\d+)?)\s*:\s*([^:]*?)(?=\d+(?:\.\d+)?\s*:|$)/g;
    let mm;
    while ((mm = re.exec(weightText))) {
      const w = parseFloat(mm[1]);
      if (/other elective/i.test(mm[2])) continue;   // 預設 1，不記
      if (w <= 1 || w > 2.5) continue;                // 只接受合理加權 1.25~2.5，過濾拆分錯誤
      for (const sid of mapSubjects(mm[2])) {
        if (sid === 'm1m2') { weights.m1 = w; weights.m2 = w; }
        else weights[sid] = w;
      }
    }
    out.push({
      id: a.code.toLowerCase().replace('js', 'cityu-js'),
      jupasCode: a.code, universityId: 'cityu',
      name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 80),
      method: m, weights, gradeScheme: 'bonusTop',
      admission: { median, lowerQuartile: lower },
      _methodText: methodText.slice(0, 60), dataStatus: 'official-2025',
    });
  }
}
fs.writeFileSync('cityu.json', JSON.stringify(out, null, 2));
const withScore = out.filter((o) => o.admission.median != null);
console.log(`CityU 專業: ${out.length}  有分數: ${withScore.length}`);
console.log('\n抽驗（對照 PDF）:');
for (const o of out.slice(0, 12)) {
  console.log(`${o.jupasCode}  M=${o.admission.median ?? '-'} LQ=${o.admission.lowerQuartile ?? '-'}  w=${JSON.stringify(o.weights)}  ${o.name.slice(0, 38)}`);
}
