// 官方計分核對修正（2026-07 audit）：
// 1) PolyU 官方係 5**=8.5 制 → 45 個課程 gradeScheme 改 bonusTop（收分數據同口徑）
// 2) HKUST 官方按學院公式計分（median 口徑亦然）→ 33 個課程裝公式
//    理學院:英×1.5+數+最佳科學(bio/chem/phys/M1/M2)+Best2
//    工程/商學院:英×2+數×2+Best3（M1/M2×1.5）
//    跨學科:暫用通用公式並標 unweighted-approx
import fs from 'node:fs';

const SCI = ['JS5101', 'JS5102', 'JS5103', 'JS5118', 'JS5181'];
const ENG = ['JS5212', 'JS5220', 'JS5230', 'JS5240', 'JS5250', 'JS5260', 'JS5270', 'JS5282'];
const BIZ = ['JS5300', 'JS5311', 'JS5312', 'JS5313', 'JS5314', 'JS5315', 'JS5316', 'JS5317', 'JS5318', 'JS5331', 'JS5332'];
const CROSS = ['JS5411', 'JS5412', 'JS5711', 'JS5811', 'JS5812', 'JS5813', 'JS5814', 'JS5822', 'JS5901'];

const sciFormula = {
  fixed: [{ subject: 'eng', weight: 1.5 }, { subject: 'math', weight: 1 }],
  groups: [{ subjects: ['bio', 'chem', 'phys', 'm1', 'm2'], weight: 1 }],
  bestN: 2,
};
const engBizFormula = {
  fixed: [{ subject: 'eng', weight: 2 }, { subject: 'math', weight: 2 }],
  bestN: 3,
  weights: { m1: 1.5, m2: 1.5 },
};

for (const rel of ['../frontend/src/data/programmes.json', '../backend/src/data/programmes.json']) {
  const url = new URL(rel, import.meta.url);
  if (!fs.existsSync(url)) { console.log('skip:', rel); continue; }
  const data = JSON.parse(fs.readFileSync(url, 'utf8'));
  let polyu = 0, ust = 0;
  for (const p of data.programmes) {
    if (p.universityId === 'polyu') { p.gradeScheme = 'bonusTop'; polyu++; }
    if (p.universityId === 'hkust') {
      p.method = 'hku';
      p.gradeScheme = 'bonusTop';
      if (SCI.includes(p.jupasCode)) { p.formula = sciFormula; delete p.weightsStatus; }
      else if (ENG.includes(p.jupasCode) || BIZ.includes(p.jupasCode)) { p.formula = engBizFormula; delete p.weightsStatus; }
      else if (CROSS.includes(p.jupasCode)) { p.formula = engBizFormula; p.weightsStatus = 'unweighted-approx'; }
      ust++;
    }
  }
  fs.writeFileSync(url, JSON.stringify(data, null, 1), 'utf8');
  console.log(`${rel}: polyu scheme→bonusTop ×${polyu}, hkust formula ×${ust}`);
}
console.log('注意：universities.js 的 polyu gradeScheme 預設值需另行改為 bonusTop');
