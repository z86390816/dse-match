// 計分引擎（前端版，與後端同源）。
import { GRADE_SCHEMES, SUBJECT_MAP } from './subjects.js';

function gradeToPoints(grade, scheme) {
  if (grade == null || grade === '') return 0;
  const table = GRADE_SCHEMES[scheme] || GRADE_SCHEMES.standard;
  return table[grade] ?? 0;
}

/**
 * 核對官方核心科最低要求（requiredCore / requireCsd 由 build_requirements.mjs 寫入）。
 *
 * 只有「填咗而且唔夠」先當未符要求；留空當未知，不攔——半張表填到一半
 * 就成版「未符要求」，比漏報更難用。reasons 回傳結構化資料而非現成句子，
 * 介面按語言自己砌字（繁／簡／英）。
 */
function checkRequirements(grades, programme) {
  const reasons = [];
  const req = programme.requiredCore || {};
  for (const [subjId, minLevel] of Object.entries(req)) {
    const g = grades[subjId];
    if (!g) continue;
    if (gradeToPoints(g, 'standard') < minLevel) {
      reasons.push({ subject: subjId, min: minLevel, got: g });
    }
  }
  if (programme.requireCsd && grades.csd) {
    const csd = grades.csd;
    const attained = csd === '達標' || csd === 'Attained' || csd === 'attained' || csd === true;
    if (!attained) reasons.push({ subject: 'csd', min: null, got: csd });
  }
  return { ok: reasons.length === 0, reasons };
}

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

  for (const { subject, weight } of f.fixed || []) if (has(subject)) push(subject, weight, '指定科');

  for (const grp of f.groups || []) {
    const cand = (grp.subjects || []).filter((id) => has(id) && !used.has(id))
      .map((id) => ({ id, pts: gradeToPoints(grades[id], scheme) })).sort((a, b) => b.pts - a.pts);
    if (cand.length) push(cand[0].id, grp.weight, '組內最佳');
  }

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

export function calculateScore(grades, programme, university) {
  const scheme = programme.gradeScheme || university?.gradeScheme || 'standard';
  const weights = programme.weights || {};
  const method = programme.method || 'best5';

  if (method === 'hku') return calculateHku(grades, programme, university, scheme);

  const perSubject = [];
  for (const [subjId, grade] of Object.entries(grades)) {
    if (subjId === 'csd') continue;
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

  let chosen;
  if (method === 'custom' && Array.isArray(programme.countSubjects)) {
    chosen = perSubject.filter((p) => programme.countSubjects.includes(p.subject));
  } else {
    const n = method === 'best6' ? 6 : 5;
    chosen = [...perSubject].sort((a, b) => b.weightedPoints - a.weightedPoints).slice(0, n);
  }

  const score = +chosen.reduce((sum, p) => sum + p.weightedPoints, 0).toFixed(2);
  return { score, breakdown: chosen, requirement: checkRequirements(grades, programme) };
}
