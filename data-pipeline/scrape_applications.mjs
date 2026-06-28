// 抓 JUPAS 各專業頁面 → 申請統計（Band A-E 報名人數）+ 核心科目要求
// 輸出 backend/src/data/applications.json，key = JS code
import fs from 'fs';
import path from 'path';

const PROG = JSON.parse(fs.readFileSync(path.resolve('../backend/src/data/programmes.json'), 'utf8')).programmes;
const SLUG = { cityu: 'cityuhk', hku: 'hku', cuhk: 'cuhk', hkust: 'hkust', polyu: 'polyu', hkbu: 'hkbu', eduhk: 'eduhk', lingnan: 'lingnanu', hkmu: 'hkmu' };

const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function parseBands(text) {
  // 申請統計表（不是收生/intake 表）：錨定「after Modification of Programme Choices」標題
  const i = text.indexOf('after Modification of Programme Choices');
  if (i < 0) return null;
  const seg = text.slice(i, i + 1300);
  const out = {};
  const re = /(20\d\d)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/g;
  let m;
  while ((m = re.exec(seg))) {
    const [, year, A, B, C, D, E, total] = m.map(Number);
    if (out[year]) break; // 只取錨點後第一個表（申請統計）；遇重複年份代表進入下一個表
    out[year] = { bandA: A, bandB: B, bandC: C, bandD: D, bandE: E, total };
  }
  return Object.keys(out).length ? out : null;
}

function parseReqs(text) {
  // "Core Subjects Minimum Level <SUBJECT> <level> ..." 直到下一段
  const i = text.indexOf('Core Subjects');
  if (i < 0) return null;
  const seg = text.slice(i, i + 600);
  const reqs = [];
  const re = /(CHINESE LANGUAGE|ENGLISH LANGUAGE|MATHEMATICS COMPULSORY PART|CITIZENSHIP AND SOCIAL DEVELOPMENT)\s+(Attained|\d)/gi;
  let m;
  while ((m = re.exec(seg))) reqs.push({ subject: m[1].trim(), min: m[2] });
  return reqs.length ? reqs : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
let ok = 0, fail = 0;

for (let k = 0; k < PROG.length; k++) {
  const p = PROG[k];
  const slug = SLUG[p.universityId];
  const url = `https://www.jupas.edu.hk/en/programme/${slug}/${p.jupasCode}/`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { fail++; process.stdout.write('x'); continue; }
    const text = strip(await res.text());
    out[p.jupasCode] = { bands: parseBands(text), requirements: parseReqs(text), url };
    ok++;
    if (ok % 25 === 0) process.stdout.write(`[${ok}]`);
    else process.stdout.write('.');
  } catch (e) { fail++; process.stdout.write('!'); }
  await sleep(150);
}

fs.writeFileSync(path.resolve('../backend/src/data/applications.json'), JSON.stringify(out, null, 2));
console.log(`\n完成：${ok} 成功 / ${fail} 失敗，共 ${Object.keys(out).length} 筆`);
const withBands = Object.values(out).filter((x) => x.bands).length;
console.log(`有申請統計：${withBands}`);
