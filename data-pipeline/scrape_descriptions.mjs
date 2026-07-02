// 爬 JUPAS 每個專業頁的官方「Short Description」全文 + 課程官網連結 + 備註。
// → 寫入 frontend/public/descriptions.json（懶載入，不進主 bundle）。
// 格式：{ [jupasCode]: { d: [段落...], w: 官網url, r: 備註 } }
import fs from 'fs';
import path from 'path';

const PROG_PATH = path.resolve('../backend/src/data/programmes.json');
const OUT = path.resolve('../frontend/public/descriptions.json');
const prog = JSON.parse(fs.readFileSync(PROG_PATH, 'utf8'));
const SLUG = { cityu: 'cityuhk', hku: 'hku', cuhk: 'cuhk', hkust: 'hkust', polyu: 'polyu', hkbu: 'hkbu', eduhk: 'eduhk', lingnan: 'lingnanu', hkmu: 'hkmu' };

// HTML 實體與標籤 → 純文字段落
function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&rsquo;/g, '’').replace(/&lsquo;/g, '‘')
    .replace(/&rdquo;/g, '”').replace(/&ldquo;/g, '“')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&hellip;/g, '…');
}
function toParas(html) {
  const txt = html
    .replace(/<\/(p|li|div|h\d|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '');
  return decode(txt).split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function extract(html) {
  // Short Description 區塊：註解標記到下一個 strokeBar_box（Programme Website）
  const si = html.indexOf('<!-- Short Description -->');
  if (si < 0) return null;
  const wi = html.indexOf('<!-- Programme Website -->', si);
  const descBlock = html.slice(si, wi > 0 ? wi : si + 20000);
  let paras = toParas(descBlock);
  // 去掉區塊標題行
  paras = paras.filter((p) => p !== 'Short Description');
  // 抽出 Remarks（通常最後一段 "Remarks: xxx" 或獨立 "Remarks:" 行 + 後續）
  let remarks = '';
  const ri = paras.findIndex((p) => /^Remarks\s*:/i.test(p));
  if (ri >= 0) {
    remarks = [paras[ri].replace(/^Remarks\s*:\s*/i, ''), ...paras.slice(ri + 1)].join(' ').trim();
    paras = paras.slice(0, ri);
  }
  if (/^[-–—]?$/.test(remarks)) remarks = '';
  // 官網：Programme Website 區塊第一個非空 href
  let website = '';
  if (wi > 0) {
    const wBlock = html.slice(wi, wi + 3000);
    const m = wBlock.match(/href="(https?:\/\/[^"]+)"/);
    if (m) website = m[1];
  }
  return { d: paras, w: website, r: remarks };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
let ok = 0, fail = 0;
const failed = [];

for (const p of prog.programmes) {
  const url = `https://www.jupas.edu.hk/en/programme/${SLUG[p.universityId]}/${p.jupasCode}/`;
  let done = false;
  for (let attempt = 0; attempt < 2 && !done; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(String(res.status));
      const info = extract(await res.text());
      if (info && info.d.length) { out[p.jupasCode] = info; ok++; done = true; }
      else throw new Error('no-desc');
    } catch (e) {
      if (attempt === 1) { fail++; failed.push(`${p.jupasCode}:${e.message}`); }
      else await sleep(600);
    }
  }
  process.stdout.write(done ? (ok % 25 === 0 ? `[${ok}]` : '.') : 'x');
  await sleep(100);
}

fs.writeFileSync(OUT, JSON.stringify(out));
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(`\n完成：${ok} 成功 / ${fail} 失敗 → ${OUT}（${kb} KB）`);
if (failed.length) console.log('失敗：', failed.join(', '));
