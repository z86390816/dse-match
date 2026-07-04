// 把 nowZh/nowEn/futureZh/futureEn 深度分析合併入 frontend/src/data/disciplines.json
import fs from 'node:fs';
import p1 from './analysis_part1.mjs';
import p2 from './analysis_part2.mjs';
import p3 from './analysis_part3.mjs';

const FILE = new URL('../frontend/src/data/disciplines.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const ds = data.disciplines || data;
const content = { ...p1, ...p2, ...p3 };

const missing = Object.keys(ds).filter((k) => !content[k]);
const extra = Object.keys(content).filter((k) => !ds[k]);
if (missing.length || extra.length) {
  console.error('missing:', missing, 'extra:', extra);
  process.exit(1);
}

for (const [k, v] of Object.entries(content)) {
  Object.assign(ds[k], v);
}
fs.writeFileSync(FILE, JSON.stringify(data, null, 1), 'utf8');
console.log(`merged ${Object.keys(content).length} disciplines ✓`);
