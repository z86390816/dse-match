// 定向補丁：只為 CUHK 與 HKU 補上「上四分位數 upperQuartile」，其餘資料不動。
// 來源 PDF 中只有這兩校公布 UQ（CityU/HKUST/PolyU/Lingnan/EdUHK/HKBU/HKMU 只有 Median±LQ）。
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import path from 'path';

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
const bandStr = (items, lo, hi) => items.filter((i) => i.x >= lo && i.x < hi).sort((a, b) => a.x - b.x).map((i) => i.str).join('');
const bandNum = (items, lo, hi) => { const s = bandStr(items, lo, hi); return isNum(s) ? parseFloat(s) : null; };
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

const uqByCode = {}; // jupasCode → upperQuartile

// ---- CUHK (p18-22): 三行 UQ/M/LQ，Weighted Total@~395-416 ----
for (let p = 18; p <= 22; p++) {
  const rs = await pageRows(p);
  const anchors = anchorsByCode(rs, 28, 60);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    let uq = null;
    for (const r of rs) {
      if (r.y < a.y - 9 || r.y >= yEnd) continue;
      const label = r.items.find((it) => it.x >= 140 && it.x < 156 && /^(UQ|M|LQ)$/.test(it.str));
      const total = bandNum(r.items, 395, 416);
      if (label && total != null && label.str === 'UQ') uq = total;
    }
    if (uq != null) uqByCode[a.code] = uq;
  }
}

// ---- HKU (p37-41): Upper@~408-455, Median@458-503, Lower@508-548 ----
for (let p = 37; p <= 41; p++) {
  const rs = await pageRows(p);
  const anchors = [];
  for (const r of rs) {
    const code = bandStr(r.items, 38, 56);
    if (/^\d{4}$/.test(code)) anchors.push({ code: 'JS' + code, y: r.y });
  }
  anchors.sort((x, y) => x.y - y.y);
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i], yEnd = anchors[i + 1]?.y ?? 9999;
    let upper = null;
    for (const r of rs) {
      if (r.y < a.y - 14 || r.y >= yEnd) continue;
      const u = bandNum(r.items, 408, 455);
      if (u != null && u >= 12 && u <= 70 && upper == null) upper = u;
    }
    if (upper != null) uqByCode[a.code] = upper;
  }
}

// ---- 寫回 programmes.json（冪等：先清掉舊 UQ，再依清洗規則重設）----
// 清洗規則：UQ 必須 ≥ median，且 (UQ − median) ≤ 8。
// CUHK 版面偶有相鄰數字欄被誤讀成 UQ（值約為 median 的兩倍），用上界剔除。
const pPath = path.resolve('../backend/src/data/programmes.json');
const json = JSON.parse(fs.readFileSync(pPath, 'utf8'));
let patched = 0, skipped = 0;
for (const prog of json.programmes) {
  if (prog.admission && 'upperQuartile' in prog.admission) delete prog.admission.upperQuartile;
  const uq = uqByCode[prog.jupasCode];
  if (uq == null || !prog.admission) continue;
  const med = prog.admission.median;
  if (med != null && (uq < med || uq - med > 8)) { skipped++; continue; }
  prog.admission.upperQuartile = uq;
  patched++;
}
fs.writeFileSync(pPath, JSON.stringify(json, null, 2));
console.log(`UQ 解析：CUHK+HKU 共抓到 ${Object.keys(uqByCode).length} 筆`);
console.log(`已補 upperQuartile：${patched} 個專業；剔除（UQ<median 或 gap>8 疑似抓錯）：${skipped}`);
