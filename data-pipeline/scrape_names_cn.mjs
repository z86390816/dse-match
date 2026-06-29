// 抓 JUPAS 各專業頁的「中文課程名」(class="program_title_cn") → 補進 programmes.json 的 nameZh。
import fs from 'fs';
import path from 'path';

const pPath = path.resolve('../backend/src/data/programmes.json');
const json = JSON.parse(fs.readFileSync(pPath, 'utf8'));
const SLUG = { cityu: 'cityuhk', hku: 'hku', cuhk: 'cuhk', hkust: 'hkust', polyu: 'polyu', hkbu: 'hkbu', eduhk: 'eduhk', lingnan: 'lingnanu', hkmu: 'hkmu' };

function parseCnName(html) {
  const m = html.match(/class="program_title_cn"[^>]*>([^<]+)</);
  if (!m) return null;
  const s = m[1].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  // 只取中文/常見符號，過濾純空白或英文殘留
  return /[一-鿿]/.test(s) ? s : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0;

for (const p of json.programmes) {
  const slug = SLUG[p.universityId];
  const url = `https://www.jupas.edu.hk/tc/programme/${slug}/${p.jupasCode}/`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { fail++; process.stdout.write('x'); continue; }
    const cn = parseCnName(await res.text());
    if (cn) { p.nameZh = cn; ok++; process.stdout.write(ok % 25 === 0 ? `[${ok}]` : '.'); }
    else { fail++; process.stdout.write('?'); }
  } catch (e) { fail++; process.stdout.write('!'); }
  await sleep(120);
}

fs.writeFileSync(pPath, JSON.stringify(json, null, 2));
console.log(`\n完成：${ok} 個有中文名 / ${fail} 失敗（共 ${json.programmes.length}）`);
