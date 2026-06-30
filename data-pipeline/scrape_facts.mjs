// 爬 JUPAS 各專業頁的統一結構化事實：學制、面試、資助類別、學歷層級。
// → 寫入 programmes.json 的 facts:{duration,interview,funding,level}。
import fs from 'fs';
import path from 'path';

const PROG_PATH = path.resolve('../backend/src/data/programmes.json');
const prog = JSON.parse(fs.readFileSync(PROG_PATH, 'utf8'));
const SLUG = { cityu: 'cityuhk', hku: 'hku', cuhk: 'cuhk', hkust: 'hkust', polyu: 'polyu', hkbu: 'hkbu', eduhk: 'eduhk', lingnan: 'lingnanu', hkmu: 'hkmu' };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

function field(text, label, stops) {
  const i = text.indexOf(label);
  if (i < 0) return null;
  let seg = text.slice(i + label.length, i + label.length + 80);
  for (const s of stops) { const j = seg.indexOf(s); if (j >= 0) seg = seg.slice(0, j); }
  return seg.trim() || null;
}

const STOPS = ['Study Level', 'Duration of Study', 'First Year Intake', 'Interview Arrangements', 'Funding Category', 'Admissions Scores', 'Recent Visit', 'Footnote'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0, fail = 0;

for (const p of prog.programmes) {
  const slug = SLUG[p.universityId];
  const url = `https://www.jupas.edu.hk/en/programme/${slug}/${p.jupasCode}/`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) { fail++; process.stdout.write('x'); continue; }
    const text = strip(await res.text());
    const duration = field(text, 'Duration of Study', STOPS);
    const interview = field(text, 'Interview Arrangements', STOPS);
    const funding = field(text, 'Funding Category', STOPS);
    const level = field(text, 'Study Level', STOPS);
    p.facts = {
      duration: duration && /year/i.test(duration) ? duration : null,
      interview: interview ? /^yes/i.test(interview) : null,
      funding: funding && funding.length < 40 ? funding : null,
      level: level && level.length < 40 ? level : null,
    };
    ok++;
    process.stdout.write(ok % 25 === 0 ? `[${ok}]` : '.');
  } catch (e) { fail++; process.stdout.write('!'); }
  await sleep(120);
}

fs.writeFileSync(PROG_PATH, JSON.stringify(prog, null, 2));
console.log(`\n完成：${ok} 成功 / ${fail} 失敗`);
const f = prog.programmes.filter((p) => p.facts?.duration).length;
console.log(`有學制資料：${f}`);
