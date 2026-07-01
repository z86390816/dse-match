// 依 JUPAS PDF（HKU p37-41）逐一手工編碼全部 HKU 專業計分公式，寫入 programmes.json。
// 支援擴充結構：fixed（指定科）、groups（組內最佳×權重）、weights（個別加權/[Weighting N]）、bestN、tailWeight。
import fs from 'fs';
import path from 'path';

const SCI = ['bio', 'chem', 'phys', 'cit', 'ist']; // 「最佳理科」科目組（footnote b）
const mm = ['m1', 'm2'];
// [Weighting N] 指定科目加權（依 PDF legend）
const W1 = { chin: 1.5 };
const W2 = { bio: 1.5, chem: 1.5, phys: 1.5, econ: 1.5, ict: 1.5, m1: 1.5, m2: 1.5 };
const W4 = { bio: 1.5, chem: 1.5, phys: 1.5, m1: 1.5, m2: 1.5 };
const W5 = { bio: 1.2, chem: 1.2, phys: 1.2, m1: 1.2, m2: 1.2 };
const W6 = { bio: 1.5, chem: 1.5, phys: 1.5, m1: 1.5, m2: 1.5 };
const W7 = { bio: 1.5, chem: 1.5, phys: 1.5, ict: 1.5 };
const W8 = { bio: 1.5, chem: 1.5, phys: 1.5, econ: 1.5, ict: 1.5, m1: 1.5, m2: 1.5 };
const W9 = { bio: 2, chem: 2, phys: 2, cit: 2, ist: 2, dat: 2, tl: 2 };

const fx = (...pairs) => pairs.map(([s, w]) => ({ subject: s, weight: w })); // fixed
const g = (subs, w) => ({ subjects: subs, weight: w }); // group

// code → formula
const F = {
  // Best 5
  JS6004: { bestN: 5 }, JS6016: { bestN: 5 }, JS6028: { bestN: 5 }, JS6042: { bestN: 5 }, JS6236: { bestN: 5 },
  JS6157: { bestN: 5 }, JS6250: { bestN: 5 }, JS6705: { bestN: 5 }, JS6717: { bestN: 5 }, JS6731: { bestN: 5 },
  // Best 6
  JS6456: { bestN: 6 }, JS6494: { bestN: 6 }, JS6949: { bestN: 6 }, JS6810: { bestN: 6 },
  // Best 5 + 0.5×6th
  JS6418: { bestN: 5, tailWeight: 0.5 }, JS6468: { bestN: 5, tailWeight: 0.5 }, JS6482: { bestN: 5, tailWeight: 0.5 },
  // Eng + Best 5
  JS6078: { fixed: fx(['eng', 1]), bestN: 5 }, JS6406: { fixed: fx(['eng', 1]), bestN: 5 },
  // 2×Eng + Best 4 (+ [W1])
  JS6274: { fixed: fx(['eng', 2]), bestN: 4 },
  JS6054: { fixed: fx(['eng', 2]), bestN: 4, weights: W1 }, JS6286: { fixed: fx(['eng', 2]), bestN: 4, weights: W1 },
  // 1.5×Eng + Best 4
  JS6066: { fixed: fx(['eng', 1.5]), bestN: 4 }, JS6092: { fixed: fx(['eng', 1.5]), bestN: 4 }, JS6822: { fixed: fx(['eng', 1.5]), bestN: 4 },
  JS6080: { fixed: fx(['chin', 1.5]), bestN: 4 }, // 1.5×Chin
  JS6779: { fixed: fx(['math', 1.5]), bestN: 4 }, // 1.5×Math
  // 1.5×Eng + 1.5×Math + Best N + 0.2×tail
  JS6755: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 3, tailWeight: 0.2 },
  JS6767: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 3, tailWeight: 0.2 },
  JS6781: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 3, tailWeight: 0.2 },
  JS6793: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 3, tailWeight: 0.2 },
  JS6846: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 3, tailWeight: 0.2 },
  JS6808: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 4, tailWeight: 0.2 },
  JS6860: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 4, tailWeight: 0.2 },
  JS6896: { fixed: fx(['eng', 1.5], ['math', 1.5]), bestN: 4, tailWeight: 0.2 },
  // 1.5×Eng + 1.25×Math + 1.25×(M1/M2) + Best 3 + 0.2×7th
  JS6884: { fixed: fx(['eng', 1.5], ['math', 1.25]), groups: [g(mm, 1.25)], bestN: 3, tailWeight: 0.2 },
  // Eng + Math + Best 3
  JS6303: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 }, JS6315: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 },
  JS6339: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 }, JS6353: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 },
  JS6377: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 }, JS6937: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 },
  JS6987: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 }, JS6925: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 },
  JS6248: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3 },
  // 2×Eng + 1.5×Math + Best 2 + [W2]
  JS6298: { fixed: fx(['eng', 2], ['math', 1.5]), bestN: 2, weights: W2 },
  // Best of Bio/Chem ×1.3 + Best 5  (JS6107 [W3])
  JS6107: { groups: [g(['bio', 'chem'], 1.3)], bestN: 5 },
  // Eng + 1.5×Math + 1.5×BestSci + Best 2 + [W4]
  JS6119: { fixed: fx(['eng', 1], ['math', 1.5]), groups: [g(SCI, 1.5)], bestN: 2, weights: W4 },
  // Eng + Math + Best 2 from sci + Best Subjects + [W5]  (近似)
  JS6688: { fixed: fx(['eng', 1], ['math', 1]), bestN: 3, weights: W5 },
  // 2×Eng + 2×(Math/M1/M2) + 2×BestSci + Best 3
  JS6858: { fixed: fx(['eng', 2]), groups: [g(['math', ...mm], 2), g(SCI, 2)], bestN: 3 },
  // Eng + 1.5×Math + 1.5×BestSci + Best 2 + [W6]
  JS6901: { fixed: fx(['eng', 1], ['math', 1.5]), groups: [g(SCI, 1.5)], bestN: 2, weights: W6 },
  // 2×Eng + 2×Math + 2×(M1/M2) + Best 2 + [W7]
  JS6224: { fixed: fx(['eng', 2], ['math', 2]), groups: [g(mm, 2)], bestN: 2, weights: W7 },
  // 1.2×Eng + 1.2×Math + 1.2×(M1/M2) + Best 2
  JS6729: { fixed: fx(['eng', 1.2], ['math', 1.2]), groups: [g(mm, 1.2)], bestN: 2 },
  // Eng + 1.5×Math + Best 2 + [W8]  (近似)
  JS6999: { fixed: fx(['eng', 1], ['math', 1.5]), bestN: 3, weights: W8 },
  // 2×Eng + 2×Math + Best 4 + [W9]
  JS6602: { fixed: fx(['eng', 2], ['math', 2]), bestN: 4, weights: W9 },
};

const PROG = path.resolve('../backend/src/data/programmes.json');
const json = JSON.parse(fs.readFileSync(PROG, 'utf8'));
let n = 0, miss = [];
for (const p of json.programmes) {
  if (p.universityId !== 'hku') continue;
  const f = F[p.jupasCode];
  if (!f) { miss.push(p.jupasCode); continue; }
  p.method = 'hku';
  p.gradeScheme = 'bonusTop';
  p.formula = { fixed: f.fixed || [], groups: f.groups || [], weights: f.weights || {}, bestN: f.bestN, tailWeight: f.tailWeight || 0 };
  p.weightsStatus = 'official-hku';
  n++;
}
fs.writeFileSync(PROG, JSON.stringify(json, null, 2));
console.log(`HKU 公式重編：${n} 個`);
if (miss.length) console.log('未覆蓋（保留原值）：', miss.join(', '));
