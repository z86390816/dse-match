// 計分引擎：把使用者 DSE 成績，按某個專業的計分規則算出最終分數。
//
// 每個專業 (programme) 的計分規則可包含：
//   method      : 'best5' | 'best6' | 'custom'
//                 best5/best6 = 取最佳 N 科總分（含必修+選修，按該專業 weights 加權後）
//                 custom      = 只計 countSubjects 指定的科目
//   weights     : { subjectId: 係數 }，預設 1。例如英文 ×1.5、數學 ×2
//   countSubjects (custom 用) : 明確要計算的科目 id 陣列
//   requiredCore: 必修最低要求，如 { eng: 3, chin: 3 } 代表英文、中文需達 Level 3
//   requireCsd  : true 代表公民與社會發展需「達標」
//
// university.gradeScheme 決定等級→分數的換分表（見 subjects.js GRADE_SCHEMES）。

const { GRADE_SCHEMES, SUBJECT_MAP } = require('../data/subjects');
const { UNIVERSITY_MAP } = require('../data/universities');

/** 把單一等級換成分數（依指定換分表）。未填或 U 視為 0。 */
function gradeToPoints(grade, scheme) {
  if (grade == null || grade === '') return 0;
  const table = GRADE_SCHEMES[scheme] || GRADE_SCHEMES.standard;
  return table[grade] ?? 0;
}

/**
 * 檢查最低門檻（必修等級、公民達標）。
 * @returns {{ ok: boolean, reasons: string[] }}
 */
function checkRequirements(grades, programme) {
  const reasons = [];
  const req = programme.requiredCore || {};
  for (const [subjId, minLevel] of Object.entries(req)) {
    const g = grades[subjId];
    const pts = gradeToPoints(g, 'standard'); // 門檻一律用標準表判斷等級高低
    if (pts < minLevel) {
      const name = SUBJECT_MAP[subjId]?.name || subjId;
      reasons.push(`${name} 需達 Level ${minLevel}（你：${g || '未填'}）`);
    }
  }
  if (programme.requireCsd) {
    // 容忍多種表示法：達標 / Attained / true
    const csd = grades.csd;
    const attained = csd === '達標' || csd === 'Attained' || csd === 'attained' || csd === true;
    if (!attained) {
      reasons.push('公民與社會發展需「達標」');
    }
  }
  return { ok: reasons.length === 0, reasons };
}

/**
 * 算出使用者在某專業的最終分數。
 * @param {Object} grades  例 { eng:'5', math:'5*', phys:'4', ... csd:'達標' }
 * @param {Object} programme  programmes.json 的一筆
 * @param {Object} university  universities.js 的一筆
 * @returns {{ score:number, breakdown:Array, requirement:{ok,reasons} }}
 */
/**
 * HKU 計分：programme.formula = { fixed:[{subject,weight}], bestN, tailWeight }
 * 分數 = Σ(固定科加權) + 最佳 N 科（其餘科，權重 1） + tailWeight × 第(N+1)佳其餘科
 */
function calculateHku(grades, programme, university, scheme) {
  const f = programme.formula || { fixed: [], bestN: 5, tailWeight: 0 };
  const breakdown = [];
  const fixedIds = new Set(f.fixed.map((x) => x.subject));

  let fixedScore = 0;
  for (const { subject, weight } of f.fixed) {
    const g = grades[subject];
    if (!g || g === 'U') continue;
    const pts = gradeToPoints(g, scheme);
    fixedScore += pts * weight;
    breakdown.push({ subject, name: SUBJECT_MAP[subject]?.name || subject, grade: g, weight, weightedPoints: +(pts * weight).toFixed(2) });
  }

  // 其餘科（排除固定科、公民），按分數高低
  const remaining = Object.entries(grades)
    .filter(([id, g]) => id !== 'csd' && g && g !== 'U' && !fixedIds.has(id))
    .map(([id, g]) => ({ subject: id, name: SUBJECT_MAP[id]?.name || id, grade: g, points: gradeToPoints(g, scheme) }))
    .sort((a, b) => b.points - a.points);

  let bestSum = 0;
  remaining.slice(0, f.bestN).forEach((r) => {
    bestSum += r.points;
    breakdown.push({ subject: r.subject, name: r.name, grade: r.grade, weight: 1, weightedPoints: +r.points.toFixed(2) });
  });

  let tailScore = 0;
  const tailSubj = remaining[f.bestN];
  if (f.tailWeight && tailSubj) {
    tailScore = tailSubj.points * f.tailWeight;
    breakdown.push({ subject: tailSubj.subject, name: tailSubj.name, grade: tailSubj.grade, weight: f.tailWeight, weightedPoints: +tailScore.toFixed(2) });
  }

  return {
    score: +(fixedScore + bestSum + tailScore).toFixed(2),
    breakdown,
    requirement: checkRequirements(grades, programme),
  };
}

function calculateScore(grades, programme, university) {
  const scheme = programme.gradeScheme || university?.gradeScheme || 'standard';
  const weights = programme.weights || {};
  const method = programme.method || 'best5';

  // HKU 線性公式：a×Eng + b×Math (+...) + Best N 其餘科 + tail×第(N+1)佳
  if (method === 'hku') {
    return calculateHku(grades, programme, university, scheme);
  }

  // 1. 把每一科算成「加權分數」
  const perSubject = [];
  for (const [subjId, grade] of Object.entries(grades)) {
    if (subjId === 'csd') continue;             // 公民不計分（只作門檻）
    if (!grade || grade === 'U') continue;
    const base = gradeToPoints(grade, scheme);
    const weight = weights[subjId] ?? 1;
    perSubject.push({
      subject: subjId,
      name: SUBJECT_MAP[subjId]?.name || subjId,
      grade,
      basePoints: base,
      weight,
      weightedPoints: +(base * weight).toFixed(2),
    });
  }

  // 2. 依計分方式選科
  let chosen;
  if (method === 'custom' && Array.isArray(programme.countSubjects)) {
    chosen = perSubject.filter((p) => programme.countSubjects.includes(p.subject));
  } else {
    const n = method === 'best6' ? 6 : 5; // 預設 best5
    chosen = [...perSubject]
      .sort((a, b) => b.weightedPoints - a.weightedPoints)
      .slice(0, n);
  }

  const score = +chosen.reduce((sum, p) => sum + p.weightedPoints, 0).toFixed(2);
  const requirement = checkRequirements(grades, programme);

  return {
    score,
    breakdown: chosen,
    requirement,
  };
}

module.exports = { calculateScore, gradeToPoints, checkRequirements };
