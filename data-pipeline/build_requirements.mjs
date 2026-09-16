// 把 JUPAS 官方「核心科目最低要求」寫入 programmes.json。
//
// 需求本來只存在 applications.json（詳情頁讀來顯示），programmes.json 的
// requiredCore / requireCsd 從來是空的，所以計分引擎的 checkRequirements
// 永遠通過、「未符要求」等級形同虛設——英文得 Level 2 也會被當成配到醫科。
// 這支腳本把同一份官方要求搬進 programmes.json，令比對真的分得出
// 「你的科目容許報的專業」。
//
// 用法：node build_requirements.mjs
import fs from 'node:fs';

// JUPAS 的科目名 → 本專案的科目 id
const SUBJ = {
  'CHINESE LANGUAGE': 'chin',
  'ENGLISH LANGUAGE': 'eng',
  'MATHEMATICS COMPULSORY PART': 'math',
};
// 公民與社會發展只有達標／未達標，官方寫 '1' / '3' / 'Attained' 都一律當「需達標」
const CSD = 'CITIZENSHIP AND SOCIAL DEVELOPMENT';

const apps = JSON.parse(fs.readFileSync(new URL('../backend/src/data/applications.json', import.meta.url), 'utf8'));

let missing = 0;
for (const rel of ['../frontend/src/data/programmes.json', '../backend/src/data/programmes.json']) {
  const url = new URL(rel, import.meta.url);
  if (!fs.existsSync(url)) { console.log('skip:', rel); continue; }
  const data = JSON.parse(fs.readFileSync(url, 'utf8'));
  let withCore = 0, withCsd = 0;
  missing = 0;

  for (const p of data.programmes) {
    const reqs = apps[p.jupasCode]?.requirements;
    if (!reqs?.length) { missing++; continue; }

    const core = {};
    let csd = false;
    for (const r of reqs) {
      if (r.subject === CSD) { csd = true; continue; }
      const id = SUBJ[r.subject];
      if (!id) { console.log('⚠️  未知科目：', r.subject, '（', p.jupasCode, '）'); continue; }
      const min = Number(r.min);
      if (!Number.isFinite(min)) { console.log('⚠️  無法解讀的最低等級：', r.subject, r.min, '（', p.jupasCode, '）'); continue; }
      core[id] = min;
    }

    if (Object.keys(core).length) { p.requiredCore = core; withCore++; } else { delete p.requiredCore; }
    if (csd) { p.requireCsd = true; withCsd++; } else { delete p.requireCsd; }
  }

  fs.writeFileSync(url, JSON.stringify(data, null, 1), 'utf8');
  console.log(`${rel}：${withCore} 個有核心科要求、${withCsd} 個要求公民達標、${missing} 個無官方要求資料`);
}
