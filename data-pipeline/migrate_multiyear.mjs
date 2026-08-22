// 把單年份的 programmes.json 轉成「多年份」結構，為 2026 數據與逐年對比做準備。
// 冪等：重複執行不會破壞已遷移的檔案。
//
//   舊： { year, source, dataNote, programmes:[ { admission:{median,lowerQuartile,upperQuartile}, ... } ] }
//   新： { year, previousYear, source, dataNote, yearNote,
//          programmes:[ { admission:<最新一年的別名>, admissionYear, admissionByYear:{ '2025':{...} },
//                         admissionDelta:null, ... } ] }
//
// `admission` 仍然指向「有數據的最新年份」，所以計分／配對／前端全部無需改動即可運作。
//
// 用法：node migrate_multiyear.mjs
import fs from 'fs';
import path from 'path';

const FILE = path.resolve('../backend/src/data/programmes.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
const baseYear = String(data.year);

let migrated = 0, already = 0;
for (const p of data.programmes) {
  if (p.admissionByYear) { already++; continue; }
  // 把現有的單年 admission 收進 admissionByYear[baseYear]
  p.admissionByYear = { [baseYear]: { ...p.admission } };
  p.admissionYear = Number(baseYear);
  p.admissionDelta = null;          // 只有一年數據，暫無對比
  migrated++;
}

if (!data.previousYear) data.previousYear = null;
if (!data.yearNote) {
  data.yearNote =
    '各校每年會調整計分公式與科目權重，官方明言收生分數「不可跨年份比較」。' +
    '本站提供的逐年變化僅作趨勢參考，不代表競爭程度的實際升降。';
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 1));
console.log(`已遷移 ${migrated} 個專業為多年份結構（原已遷移 ${already} 個）；基準年 ${baseYear}`);
