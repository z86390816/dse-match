// 套用 discipline_overrides.json 到 frontend（及 backend 如存在）programmes.json
import fs from 'node:fs';

const overrides = JSON.parse(fs.readFileSync(new URL('./discipline_overrides.json', import.meta.url), 'utf8'));
delete overrides._comment;

for (const rel of ['../frontend/src/data/programmes.json', '../backend/src/data/programmes.json']) {
  const url = new URL(rel, import.meta.url);
  if (!fs.existsSync(url)) { console.log('skip（不存在）:', rel); continue; }
  const data = JSON.parse(fs.readFileSync(url, 'utf8'));
  let changed = 0, missing = [];
  const byCode = new Map(data.programmes.map((p) => [p.jupasCode, p]));
  for (const [code, disc] of Object.entries(overrides)) {
    const p = byCode.get(code);
    if (!p) { missing.push(code); continue; }
    if (p.discipline !== disc) { p.discipline = disc; changed++; }
  }
  fs.writeFileSync(url, JSON.stringify(data, null, 1), 'utf8');
  console.log(`${rel}: 修正 ${changed} 個${missing.length ? '；搵唔到 code: ' + missing.join(',') : ''}`);
}
