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
 * HKU 計分：programme.formula = {
 *   fixed:[{subject,weight}],          指定科（英/數等），必計
 *   groups:[{subjects:[id],weight}],   組內最佳一科 × weight（如「2×最佳理科」「2×Math/M1/M2」）
 *   weights:{ id:weight },             其餘科的個別加權（如程式指定 [Weighting N]）
 *   bestN, tailWeight
 * }
 * 分數 = Σ指定科 + Σ組內最佳科 + 最佳 N 科（其餘、按加權）+ tail×第(N+1)佳
 */
function calculateHku(grades, programme, university, scheme) {
  const f = programme.formula || { fixed: [], bestN: 5, tailWeight: 0 };
  const breakdown = [];
  const used = new Set();
  let total = 0;
  const has = (id) => grades[id] && grades[id] !== 'U';
  const push = (id, weight, role) => {
    const pts = gradeToPoints(grades[id], scheme);
    total += pts * weight;
    used.add(id);
    breakdown.push({ subject: id, name: SUBJECT_MAP[id]?.name || id, grade: grades[id], basePoints: pts, weight, weightedPoints: +(pts * weight).toFixed(2), role });
  };

  // 1. 指定科（必計）
  for (const { subject, weight } of f.fixed || []) if (has(subject)) push(subject, weight, '指定科');

  // 2. 組內最佳一科
  for (const grp of f.groups || []) {
    const cand = (grp.subjects || []).filter((id) => has(id) && !used.has(id))
      .map((id) => ({ id, pts: gradeToPoints(grades[id], scheme) })).sort((a, b) => b.pts - a.pts);
    if (cand.length) push(cand[0].id, grp.weight, '組內最佳');
  }

  // 3. 其餘科按加權取最佳 N
  const W = f.weights || {};
  const remaining = Object.entries(grades)
    .filter(([id, g]) => id !== 'csd' && g && g !== 'U' && !used.has(id))
    .map(([id, g]) => ({ subject: id, name: SUBJECT_MAP[id]?.name || id, grade: g, points: gradeToPoints(g, scheme), w: W[id] || 1 }))
    .map((r) => ({ ...r, val: r.points * r.w }))
    .sort((a, b) => b.val - a.val);

  remaining.slice(0, f.bestN).forEach((r) => {
    total += r.val;
    breakdown.push({ subject: r.subject, name: r.name, grade: r.grade, basePoints: r.points, weight: r.w, weightedPoints: +r.val.toFixed(2), role: `最佳 ${f.bestN} 科` });
  });

  const tailSubj = remaining[f.bestN];
  if (f.tailWeight && tailSubj) {
    total += tailSubj.points * f.tailWeight;
    breakdown.push({ subject: tailSubj.subject, name: tailSubj.name, grade: tailSubj.grade, basePoints: tailSubj.points, weight: f.tailWeight, weightedPoints: +(tailSubj.points * f.tailWeight).toFixed(2), role: `第 ${f.bestN + 1} 佳` });
  }

  return { score: +total.toFixed(2), breakdown, requirement: checkRequirements(grades, programme) };
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
