// 配對引擎（前端版，與後端同源）。
import { calculateScore } from './scoreCalculator.js';
import { UNIVERSITY_MAP } from './universities.js';

function classify(score, programme, requirementOk) {
  if (programme.scoreComparable === false) return 'reference';
  if (!requirementOk) return 'unqualified';
  const { median, lowerQuartile, minScore } = programme.admission || {};
  if (median != null && score >= median) return 'safe';
  if (lowerQuartile != null && score >= lowerQuartile) return 'competitive';
  if (minScore != null && score >= minScore) return 'reach';
  if (lowerQuartile != null && score >= lowerQuartile * 0.9) return 'reach';
  return 'below';
}

const TIER_ORDER = { safe: 0, competitive: 1, reach: 2, below: 3, unqualified: 4, reference: 5 };

export function matchAll(grades, programmes) {
  const results = programmes
    .filter((programme) => programme.scoreComparable !== false)
    .map((programme) => {
      const university = UNIVERSITY_MAP[programme.universityId];
      const { score, breakdown, requirement } = calculateScore(grades, programme, university);
      const tier = classify(score, programme, requirement.ok);
      const { median, lowerQuartile } = programme.admission || {};

      return {
        programmeId: programme.id,
        jupasCode: programme.jupasCode,
        name: programme.name,
        nameZh: programme.nameZh || null,
        universityId: programme.universityId,
        universityShort: university?.short,
        universityShortZh: university?.shortZh,
        universityName: university?.name,
        category: programme.category,
        discipline: programme.discipline ?? null,
        facts: programme.facts ?? null,
        admitted2025: programme.admitted2025 ?? null,
        intake: programme.intake ?? null,
        method: programme.method,
        gradeScheme: programme.gradeScheme || university?.gradeScheme || 'standard',
        weights: programme.weights || {},
        formula: programme.formula || null,
        weightsStatus: programme.weightsStatus || null,
        dataStatus: programme.dataStatus || 'sample',
        admission: programme.admission,
        yourScore: score,
        gapToMedian: median != null ? +(score - median).toFixed(2) : null,
        gapToLowerQuartile: lowerQuartile != null ? +(score - lowerQuartile).toFixed(2) : null,
        tier,
        scoreComparable: programme.scoreComparable !== false,
        scaleNote: programme.scaleNote || null,
        requirementOk: requirement.ok,
        requirementReasons: requirement.reasons,
        breakdown,
      };
    });

  results.sort((a, b) => {
    if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    return (b.gapToMedian ?? -999) - (a.gapToMedian ?? -999);
  });

  return results;
}

export { classify, TIER_ORDER };
