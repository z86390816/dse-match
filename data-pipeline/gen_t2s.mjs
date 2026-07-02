// 生成繁→簡「字元對映表」。用 opencc-js 逐字轉換整個常用 CJK 區，
// 只保留「轉換後不同」的字，輸出 frontend/src/engine/t2s.json。
// 前端在簡體模式下用此表逐字轉換所有中文（UI、專業名、AI 分析等）。
import * as OpenCC from 'opencc-js';
import fs from 'fs';
import path from 'path';

// 香港繁體 → 大陸簡體（字級）
const convert = OpenCC.Converter({ from: 'hk', to: 'cn' });

const map = {};
let count = 0;
// CJK 統一漢字（含擴充 A 常用區）
const ranges = [[0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xf900, 0xfaff]];
for (const [lo, hi] of ranges) {
  for (let cp = lo; cp <= hi; cp++) {
    const ch = String.fromCodePoint(cp);
    const s = convert(ch);
    if (s && s !== ch && [...s].length === 1) { map[ch] = s; count++; }
  }
}

const out = path.resolve('../frontend/src/engine/t2s.json');
fs.writeFileSync(out, JSON.stringify(map));
console.log(`繁→簡字元表：${count} 個對映，寫入 ${out}（${(fs.statSync(out).size / 1024).toFixed(0)} KB）`);
