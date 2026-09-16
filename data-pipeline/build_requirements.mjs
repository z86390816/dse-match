// 把 JUPAS 官方「核心科目最低要求」寫入 programmes.json 的 requiredCore / requireCsd，
// 令計分引擎的 checkRequirements 真的分得出「你的科目容許報的專業」。
//
// ⚠️ 目前寫唔到：上游 applications.json 的 requirements 唔可信，本腳本會驗完就停。
//
// 原因在 scrape_applications.mjs 的 parseReqs()：JUPAS 課程頁在「Core Subjects」
// 底下其實有兩個區塊——先係「該課程的要求」，跟住係「該大學的一般最低要求」。
// parseReqs 由第一個 'Core Subjects' 起只掃 600 字，於是：
//   * 52 個專業兩個區塊都抓到（同一科出現兩次，等級唔同）
//     例：JS4501 → ENGLISH=4, MATHEMATICS=3（課程），再 ENGLISH=3, MATHEMATICS=2（一般）
//   * 其餘多數只抓到半個區塊，有啲截到連 MATHEMATICS 都冇
//     例：JS4468 → 得 CHINESE / CITIZENSHIP / ENGLISH，而且 ENGLISH=4 係課程那組
//   * 27 個專業的「公民與社會發展」竟然係數字等級（官方只有 Attained／未達標）
//   * 42 個冇中文、23 個冇數學
// 兩邊都錯：有啲偏嚴（攔住本來報得的人，例如 JS4468 英文 3 被當成未符要求），
// 有啲偏鬆。攔人的規則唔可以建喺咁的數據上，所以寧願唔攔。
//
// 要重新啟用：先修好 parseReqs（錨定「Core Subjects」表本身、只讀該表的 4 行，
// 並把課程要求與大學一般要求分開存），重新 scrape，本腳本驗證通過就會寫入。
// 用法：node build_requirements.mjs
import fs from 'node:fs';

const SUBJ = {
  'CHINESE LANGUAGE': 'chin',
  'ENGLISH LANGUAGE': 'eng',
  'MATHEMATICS COMPULSORY PART': 'math',
};
const CSD = 'CITIZENSHIP AND SOCIAL DEVELOPMENT';
const CORE = [...Object.keys(SUBJ), CSD];

const apps = JSON.parse(fs.readFileSync(new URL('../backend/src/data/applications.json', import.meta.url), 'utf8'));

// ── 先驗上游數據，唔過就停手 ──
const problems = { dupSubject: [], missingSubject: [], csdNotAttained: [] };
for (const [code, a] of Object.entries(apps)) {
  const reqs = a.requirements;
  if (!reqs?.length) continue;
  const subjects = reqs.map((r) => r.subject);
  if (new Set(subjects).size !== subjects.length) problems.dupSubject.push(code);
  if (CORE.some((s) => !subjects.includes(s))) problems.missingSubject.push(code);
  if (reqs.some((r) => r.subject === CSD && r.min !== 'Attained')) problems.csdNotAttained.push(code);
}

const bad = Object.values(problems).reduce((n, l) => n + l.length, 0);
if (bad > 0) {
  console.log('❌ applications.json 的 requirements 未通過驗證，唔會寫入 programmes.json：');
  console.log(`   同一科出現多次（抓到兩個區塊）：${problems.dupSubject.length} 個，例 ${problems.dupSubject.slice(0, 3).join(' ')}`);
  console.log(`   四個核心科唔齊（600 字視窗截斷）：${problems.missingSubject.length} 個，例 ${problems.missingSubject.slice(0, 3).join(' ')}`);
  console.log(`   公民與社會發展係數字等級（官方只有 Attained）：${problems.csdNotAttained.length} 個，例 ${problems.csdNotAttained.slice(0, 3).join(' ')}`);
  console.log('   → 先修好 scrape_applications.mjs 的 parseReqs()，重新 scrape 再跑本腳本。');
  process.exit(1);
}

let withCore = 0, withCsd = 0, missing = 0;
for (const rel of ['../frontend/src/data/programmes.json', '../backend/src/data/programmes.json']) {
  const url = new URL(rel, import.meta.url);
  if (!fs.existsSync(url)) { console.log('skip:', rel); continue; }
  const data = JSON.parse(fs.readFileSync(url, 'utf8'));
  withCore = 0; withCsd = 0; missing = 0;

  for (const p of data.programmes) {
    const reqs = apps[p.jupasCode]?.requirements;
    if (!reqs?.length) { missing++; continue; }
    const core = {};
    let csd = false;
    for (const r of reqs) {
      if (r.subject === CSD) { csd = true; continue; }
      const id = SUBJ[r.subject];
      const min = Number(r.min);
      if (id && Number.isFinite(min)) core[id] = min;
    }
    if (Object.keys(core).length) { p.requiredCore = core; withCore++; } else { delete p.requiredCore; }
    if (csd) { p.requireCsd = true; withCsd++; } else { delete p.requireCsd; }
  }

  fs.writeFileSync(url, JSON.stringify(data, null, 1), 'utf8');
  console.log(`${rel}：${withCore} 個有核心科要求、${withCsd} 個要求公民達標、${missing} 個無官方要求資料`);
}
