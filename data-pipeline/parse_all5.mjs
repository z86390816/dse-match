// 解析 5 所主要大學 → 引擎格式 programmes（各校版面不同，逐校 handler）
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const data = new Uint8Array(fs.readFileSync('jupas_all_2025.pdf'));
const doc = await getDocument({ data, verbosity: 0 }).promise;

const isNum = (s) => /^-?\d+(\.\d+)?$/.test(s);
async function pageRows(p) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const items = tc.items.filter((i) => i.str.trim())
    .map((i) => ({ str: i.str.trim(), x: +i.transform[4].toFixed(1), y: +(vp.height - i.transform[5]).toFixed(1) }));
  const rs = [];
  for (const it of items.sort((a, b) => a.y - b.y || a.x - b.x)) {
    let r = rs.find((x) => Math.abs(x.y - it.y) < 3);
    if (!r) { r = { y: it.y, items: [] }; rs.push(r); }
    r.items.push(it);
  }
  rs.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  return rs.sort((a, b) => a.y - b.y);
}
// 合併某 x 區間內被拆的 token，串成一個字串/數字
function bandStr(items, lo, hi) {
  return items.filter((i) => i.x >= lo && i.x < hi).sort((a, b) => a.x - b.x).map((i) => i.str).join('');
}
function bandNum(items, lo, hi) {
  const s = bandStr(items, lo, hi);
  return isNum(s) ? parseFloat(s) : null;
}
// 在一頁找左欄 JS code 錨點（可被拆），x 區間視院校而定
function anchorsByCode(rs, xlo, xhi, codeLen = 4) {
  const out = [];
  for (const r of rs) {
    const left = r.items.filter((i) => i.x >= xlo && i.x < xhi).sort((a, b) => a.x - b.x);
    if (!left.length) continue;
    let s = '';
    for (const it of left) {
      const t = it.str.replace(/\s/g, '');
      if (s === '' && /^JS\d*$/.test(t)) s = t;
      else if (s && /^\d+$/.test(t) && it.x < left[0].x + 90) s += t;
      if (new RegExp(`^JS\\d{${codeLen}}$`).test(s)) break;
    }
    if (new RegExp(`^JS\\d{${codeLen}}$`).test(s)) out.push({ code: s, y: r.y });
  }
  return out.sort((a, b) => a.y - b.y);
}

const SUBJ = [
  [/Chinese History/i, 'chist'], [/Chinese|Chi\b/i, 'chin'], [/English|Eng\b/i, 'eng'],
  [/Mathematics|Math\b|Maths/i, 'math'], [/M1\/?\s*M2|M1|M2/i, 'm1m2'],
  [/Biology|Bio\b/i, 'bio'], [/Chemistry|Chem\b/i, 'chem'], [/Physics|Phy\b/i, 'phys'],
  [/Economics|Econ/i, 'econ'], [/Business, Accounting|BAFS/i, 'bafs'],
  [/Information and\s*Communication|ICT/i, 'ict'], [/Geography|Geog/i, 'geog'],
  [/History|Hist/i, 'hist'], [/Visual Arts/i, 'va'],
];
const mapSubj = (t) => { for (const [re, id] of SUBJ) if (re.test(t)) return id; return null; };

const all = [];

// ---------------- CityU (p2-8): Best-N + 加權清單, Median+LQ ----------------
for (let p = 2; p <= 8; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 45, 120);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = [], method = [], weight = []; let median = null, lower = null;
    for (const r of rs) {
      const inS = r.y >= a.y - 2 && r.y < yEnd, inF = r.y >= a.y - 12 && r.y < yEnd - 2;
      for (const it of r.items) {
        const c = it.x;
        if (inS && c >= 440 && c < 493 && isNum(it.str)) { const v = +it.str; if (v >= 12 && v <= 70 && median == null) median = v; }
        else if (inS && c >= 493 && c < 545 && isNum(it.str)) { const v = +it.str; if (v >= 12 && v <= 70 && lower == null) lower = v; }
        if (c < 225 && inS && !/^JS\d/.test(it.str.replace(/\s/g, ''))) title.push(it.str);
        else if (inF && c >= 225 && c < 318) method.push(it.str);
        else if (inF && c >= 318 && c < 448) weight.push(it.str);
      }
    }
    const wt = weight.join(' ').replace(/\s+/g, ' ');
    const weights = {}; let mm; const re = /(\d+(?:\.\d+)?)\s*:\s*([^:]*?)(?=\d+(?:\.\d+)?\s*:|$)/g;
    while ((mm = re.exec(wt))) { const w = +mm[1]; if (/other elective/i.test(mm[2]) || w <= 1 || w > 2.5) continue; for (const part of mm[2].split('/')) { const id = mapSubj(part); if (id === 'm1m2') { weights.m1 = w; weights.m2 = w; } else if (id) weights[id] = w; } }
    all.push({ id: a.code.toLowerCase().replace('js', 'cityu-js'), jupasCode: a.code, universityId: 'cityu', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: /Best 6|6 subjects/i.test(method.join(' ')) ? 'best6' : 'best5', weights, gradeScheme: 'bonusTop', admission: { median, lowerQuartile: lower }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'auto-parsed' });
  }
}

// ---------------- CUHK (p18-22): 三行 UQ/M/LQ, Weighted Total@~403 ----------------
for (let p = 18; p <= 22; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 28, 60);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = []; let median = null, lower = null; const wtxt = [];
    for (const r of rs) {
      if (r.y < a.y - 9 || r.y >= yEnd) continue;
      const label = r.items.find((it) => it.x >= 140 && it.x < 156 && /^(UQ|M|LQ)$/.test(it.str));
      const total = bandNum(r.items, 395, 416);
      if (label && total != null) { if (label.str === 'M') median = total; else if (label.str === 'LQ') lower = total; }
      for (const it of r.items) {
        if (it.x >= 50 && it.x < 140 && !/^JS\d/.test(it.str)) title.push(it.str);
        if (it.x >= 448) wtxt.push(it.str);
      }
    }
    const wt = wtxt.join(' ');
    const weights = {}; let mm; const re = /([A-Za-z][A-Za-z ]*?)\s*\(\s*x\s*(\d+(?:\.\d+)?)\s*\)/g;
    while ((mm = re.exec(wt))) { const id = mapSubj(mm[1]); const w = +mm[2]; if (id === 'm1m2') { weights.m1 = w; weights.m2 = w; } else if (id) weights[id] = w; }
    const med = ['js4501', 'js4502'].includes(a.code.toLowerCase());
    all.push({ id: a.code.toLowerCase().replace('js', 'cuhk-js'), jupasCode: a.code, universityId: 'cuhk', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights, gradeScheme: med ? 'standard' : 'bonusTop', admission: { median, lowerQuartile: lower }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'auto-parsed' });
  }
}

// ---------------- HKUST (p34-36): Best5+6th bonus, Median@~333 Lower@~380 ----------------
for (let p = 34; p <= 36; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 35, 78);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = []; let median = null, lower = null;
    for (const r of rs) {
      const inS = r.y >= a.y - 2 && r.y < yEnd;
      if (!inS) continue;
      const m = bandNum(r.items, 325, 360), l = bandNum(r.items, 378, 410);
      if (m != null && m >= 12 && m <= 70 && median == null) median = m;
      if (l != null && l >= 12 && l <= 70 && lower == null) lower = l;
      for (const it of r.items) if (it.x >= 78 && it.x < 250 && !/^JS\d/.test(it.str.replace(/\s/g, ''))) title.push(it.str);
    }
    all.push({ id: a.code.toLowerCase().replace('js', 'hkust-js'), jupasCode: a.code, universityId: 'hkust', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights: {}, gradeScheme: 'bonusTop', admission: { median, lowerQuartile: lower }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'approx-best5' });
  }
}

// ---------------- HKU (p37-41): 線性公式, code 無JS@~43, Median@~463 Lower@~515 ----------------
for (let p = 37; p <= 41; p++) {
  const rs = await pageRows(p);
  // HKU 錨點：x~43 的 4 位數字
  const anchors = [];
  for (const r of rs) {
    const code = bandStr(r.items, 38, 56);
    if (/^\d{4}$/.test(code)) anchors.push({ code: 'JS' + code, y: r.y });
  }
  anchors.sort((x, y) => x.y - y.y);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = [], formula = []; let median = null, lower = null;
    for (const r of rs) {
      if (r.y < a.y - 14 || r.y >= yEnd) continue;
      const m = bandNum(r.items, 458, 503), l = bandNum(r.items, 508, 548);
      if (m != null && m >= 12 && m <= 70 && median == null) median = m;
      if (l != null && l >= 12 && l <= 70 && lower == null) lower = l;
      for (const it of r.items) {
        if (it.x >= 70 && it.x < 250) title.push(it.str);
        else if (it.x >= 250 && it.x < 410) formula.push(it.str);
      }
    }
    // 正規化：把被拆的小數 "1. 5"→"1.5"、"6 th"→"6th"
    const ftxt = formula.join(' ').replace(/\s+/g, ' ').replace(/(\d)\s*\.\s*(\d)/g, '$1.$2').replace(/(\d)\s+(st|nd|rd|th)\b/gi, '$1$2').trim();
    // 只取公式第一次出現的部分（截到第一個 "Best N Subjects + 0.x Nth Best"），避免下一程式 bleed
    const cut = ftxt.match(/^.*?Best\s+\d+\s+Subjects[^+]*(?:\+\s*[\d.]+\s*x\s*\d+(?:st|nd|rd|th)\s+Best[^+]*)?/i);
    const f1 = cut ? cut[0] : ftxt;
    const fixed = []; const seen = new Set(); let mm; const fre = /(\d+(?:\.\d+)?)\s*x\s*(Eng|Math|M1\s*\/?\s*M2|Chi)/gi;
    while ((mm = fre.exec(f1))) { const id = mapSubj(mm[2]); const ids = id === 'm1m2' ? ['m1', 'm2'] : [id]; for (const s of ids) { if (s && !seen.has(s)) { seen.add(s); fixed.push({ subject: s, weight: +mm[1] }); } } }
    const bestN = (f1.match(/Best\s+(\d+)\s+Subjects/i) || [])[1];
    const tail = f1.match(/(\d+(?:\.\d+)?)\s*x\s*\d+(?:st|nd|rd|th)\s+Best/i);
    all.push({ id: a.code.toLowerCase().replace('js', 'hku-js'), jupasCode: a.code, universityId: 'hku', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'hku', formula: { fixed, bestN: bestN ? +bestN : 3, tailWeight: tail ? +tail[1] : 0 }, formulaText: ftxt.slice(0, 80), gradeScheme: 'bonusTop', admission: { median, lowerQuartile: lower }, scoreComparable: fixed.length > 0 || !!bestN, dataStatus: 'official-2025', weightsStatus: 'parsed-formula' });
  }
}

// ---------------- PolyU (p27-33): 200-300 尺度, 無法複製公式 → 僅供參考 ----------------
for (let p = 27; p <= 33; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 170, 215);
  // 先收集整頁的 Median / Lower Quartile 值（PolyU 分數列與 code 不同 y，用最近錨點配對）
  const medRows = [], lqRows = [];
  for (const r of rs) {
    const val = bandNum(r.items, 488, 528);
    if (val == null || val < 100) continue; // PolyU 為 ~200-300 尺度
    if (r.items.some((it) => it.x >= 410 && it.x < 465 && /Median/i.test(it.str))) medRows.push({ val, y: r.y });
    if (r.items.some((it) => it.x >= 398 && it.x < 465 && /Lower|Quartile/i.test(it.str))) lqRows.push({ val, y: r.y });
  }
  const nearest = (arr, y) => { let best = null, bd = 1e9; for (const o of arr) { const d = Math.abs(o.y - y); if (d < bd) { bd = d; best = o; } } return bd <= 45 ? best.val : null; };
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = [];
    const median = nearest(medRows, a.y), lower = nearest(lqRows, a.y);
    for (const r of rs) {
      if (r.y < a.y - 14 || r.y >= yEnd) continue;
      for (const it of r.items) if (it.x >= 55 && it.x < 170 && !/^JS\d/.test(it.str.replace(/\s/g, ''))) title.push(it.str);
    }
    all.push({ id: a.code.toLowerCase().replace('js', 'polyu-js'), jupasCode: a.code, universityId: 'polyu', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights: {}, gradeScheme: 'bonusTop', admission: { median, lowerQuartile: lower }, scoreComparable: false, scaleNote: 'PolyU 用 ~200-300 百分位尺度，計分公式不在公開 PDF，暫僅供參考', dataStatus: 'official-2025-noformula', weightsStatus: 'n/a' });
  }
}

// 解析「科目 (xN)」加權文字（HKMU/EdUHK 用）
function parseWeightParen(txt) {
  const weights = {}; let mm; const re = /([A-Za-z][A-Za-z ,\/]*?)\s*\(\s*x\s*(\d+(?:\.\d+)?)\s*\)/g;
  while ((mm = re.exec(txt))) { const w = +mm[2]; for (const part of mm[1].split(/[,\/]/)) { const id = mapSubj(part); if (id === 'm1m2') { weights.m1 = w; weights.m2 = w; } else if (id) weights[id] = w; } }
  return weights;
}

// ---------------- Lingnan (p16-17): Best5 standard, Median/LQ score@~275 ----------------
for (let p = 16; p <= 17; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 25, 55);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = []; const vals = [];   // Lingnan: Median 行先、LQ 行後，標籤與值常不同行 → 取前兩個分數值
    for (const r of rs) {
      if (r.y < a.y - 6 || r.y >= yEnd) continue;
      const val = bandNum(r.items, 265, 300);
      if (val != null && val >= 8 && val <= 45) vals.push(val);
      for (const it of r.items) if (it.x >= 26 && it.x < 210 && !/^JS\d/.test(it.str.replace(/\s/g, '')) && !/Median|Lower|Quartile/.test(it.str)) title.push(it.str);
    }
    const median = vals[0] ?? null, lower = vals[1] ?? null;
    all.push({ id: a.code.toLowerCase().replace('js', 'lingnan-js'), jupasCode: a.code, universityId: 'lingnan', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights: {}, gradeScheme: 'standard', admission: { median, lowerQuartile: lower }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'unweighted' });
  }
}

// ---------------- EdUHK (p23-26): Best5 standard, Median@~293 LQ@~250, 加權 ----------------
for (let p = 23; p <= 26; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 28, 62);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = [], wtxt = []; let median = null, lower = null;
    for (const r of rs) {
      if (r.y < a.y - 6 || r.y >= yEnd) continue;
      const m = bandNum(r.items, 283, 312), l = bandNum(r.items, 242, 278);
      if (m != null && m >= 8 && m <= 45 && median == null) median = m;
      if (l != null && l >= 8 && l <= 45 && lower == null) lower = l;
      for (const it of r.items) { if (it.x >= 85 && it.x < 165) title.push(it.str); else if (it.x >= 330 && it.x < 420) wtxt.push(it.str); }
    }
    all.push({ id: a.code.toLowerCase().replace('js', 'eduhk-js'), jupasCode: a.code, universityId: 'eduhk', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights: parseWeightParen(wtxt.join(' ')), gradeScheme: 'standard', admission: { median, lowerQuartile: lower }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'auto-parsed' });
  }
}

// ---------------- HKBU (p9-15): Best5, Mean 分數@~63（Median 然後 LQ）----------------
for (let p = 9; p <= 15; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 52, 92);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = []; const means = [];
    for (const r of rs) {
      if (r.y < a.y - 2 || r.y >= yEnd) continue;
      const v = bandNum(r.items, 56, 78);
      if (v != null && v >= 8 && v <= 45) means.push(v);
      for (const it of r.items) if (it.x >= 95 && it.x < 540 && !/^JS\d/.test(it.str.replace(/\s/g, '')) && !/Score Formula|Best 5|Median|Lower Quartile|Elective|Mean|CHIN|ENGL|MATH|Attained/i.test(it.str)) title.push(it.str);
    }
    all.push({ id: a.code.toLowerCase().replace('js', 'hkbu-js'), jupasCode: a.code, universityId: 'hkbu', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights: {}, gradeScheme: 'standard', admission: { median: means[0] ?? null, lowerQuartile: means[1] ?? null }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'unweighted' });
  }
}

// ---------------- HKMU (p42-44): Best5, Median@~370 LQ@~426, 加權@~466 ----------------
for (let p = 42; p <= 44; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 18, 66);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    const title = [], wtxt = []; let median = null, lower = null;
    for (const r of rs) {
      if (r.y < a.y - 2 || r.y >= yEnd) continue;
      const m = bandNum(r.items, 358, 400), l = bandNum(r.items, 412, 452);
      if (m != null && m >= 8 && m <= 45 && median == null) median = m;
      if (l != null && l >= 8 && l <= 45 && lower == null) lower = l;
      for (const it of r.items) { if (it.x >= 90 && it.x < 350 && !/^JS\d/.test(it.str.replace(/\s/g, ''))) title.push(it.str); else if (it.x >= 455) wtxt.push(it.str); }
    }
    all.push({ id: a.code.toLowerCase().replace('js', 'hkmu-js'), jupasCode: a.code, universityId: 'hkmu', name: title.join(' ').replace(/\s+/g, ' ').trim().slice(0, 70), method: 'best5', weights: parseWeightParen(wtxt.join(' ')), gradeScheme: 'standard', admission: { median, lowerQuartile: lower }, scoreComparable: true, dataStatus: 'official-2025', weightsStatus: 'auto-parsed' });
  }
}

fs.writeFileSync('all5.json', JSON.stringify(all, null, 2));
const byInst = {}; const scored = {};
for (const r of all) { byInst[r.universityId] = (byInst[r.universityId] || 0) + 1; if (r.admission.median != null) scored[r.universityId] = (scored[r.universityId] || 0) + 1; }
console.log('各校專業數:', JSON.stringify(byInst));
console.log('各校有分數:', JSON.stringify(scored));
function show(inst, codes) { console.log(`\n[${inst}] 抽驗:`); for (const c of codes) { const r = all.find((x) => x.jupasCode === c && x.universityId === inst); console.log(`  ${c}  M=${r?.admission.median} LQ=${r?.admission.lowerQuartile}  ${r?.formulaText || JSON.stringify(r?.weights) || ''}`); } }
show('cuhk', ['JS4018', 'JS4032', 'JS4044', 'JS4068']);
show('hkust', ['JS5101', 'JS5102', 'JS5103']);
show('hku', ['JS6793', 'JS6808', 'JS6846', 'JS6860', 'JS6884']);
show('polyu', ['JS3320']);
