// 抓 JUPAS 各專業頁的「取錄統計 Offer Statistics（正式遴選輪）」多年 Band A-E 取錄人數
// 及「首年學額 First Year Intake」。
// → 補進 applications.json（offers, intake）並把 2025 取錄總數寫入 programmes.json（admitted2025, intake）。
import fs from 'fs';
import path from 'path';

const PROG_PATH = path.resolve('../backend/src/data/programmes.json');
const APP_PATH = path.resolve('../backend/src/data/applications.json');
const progJson = JSON.parse(fs.readFileSync(PROG_PATH, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(APP_PATH, 'utf8'));
const SLUG = { cityu: 'cityuhk', hku: 'hku', cuhk: 'cuhk', hkust: 'hkust', polyu: 'polyu', hkbu: 'hkbu', eduhk: 'eduhk', lingnan: 'lingnanu', hkmu: 'hkmu' };

const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function parseOffers(text) {
  // 錨定「Offer Statistics (as at the Announcement of the Main Round Offer Results)」
  const i = text.indexOf('Offer Statistics (as at');
  if (i < 0) return null;
  const seg = text.slice(i, i + 1300);
  const out = {};
  const re = /(20\d\d)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g;
  let m;
  while ((m = re.exec(seg))) {
    const [, year, A, B, C, D, E, total] = m.map(Number);
    if (out[year]) break; // 只取第一個表（取錄）；遇重複年份代表進入下一表
    out[year] = { bandA: A, bandB: B, bandC: C, bandD: D, bandE: E, total };
  }
  return Object.keys(out).length ? out : null;
}

function parseIntake(text) {
  const m = text.match(/First Year Intake\s+(\d+)/);
  return m ? +m[1] : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0, withOffers = 0;

for (const p of progJson.programmes) {
  const slug = SLUG[p.universityId];
  const url = `https://www.jupas.edu.hk/en/programme/${slug}/${p.jupasCode}/`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { fail++; process.stdout.write('x'); continue; }
    const text = strip(await res.text());
    const offers = parseOffers(text);
    const intake = parseIntake(text);

    if (!appJson[p.jupasCode]) appJson[p.jupasCode] = { bands: null, requirements: null, url };
    appJson[p.jupasCode].offers = offers;
    appJson[p.jupasCode].intake = intake;

    // 寫入 programmes.json：2025 取錄總數 + 學額
    if (offers?.['2025']?.total != null) { p.admitted2025 = offers['2025'].total; withOffers++; }
    else if ('admitted2025' in p) delete p.admitted2025;
    if (intake != null) p.intake = intake; else if ('intake' in p) delete p.intake;

    ok++;
    process.stdout.write(ok % 25 === 0 ? `[${ok}]` : '.');
  } catch (e) { fail++; process.stdout.write('!'); }
  await sleep(120);
}

fs.writeFileSync(APP_PATH, JSON.stringify(appJson, null, 2));
fs.writeFileSync(PROG_PATH, JSON.stringify(progJson, null, 2));
console.log(`\n完成：${ok} 頁成功 / ${fail} 失敗；有 2025 取錄數：${withOffers}`);
