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

// 沒有中位數可比的專業，排在同級最後。
const NO_RATIO = -999;

/**
 * 相對差距 =（你的分數 − 收生中位數）/ 收生中位數。
 * 各校計分尺度差很遠（PolyU ~200 分制、HKU 加權制、其餘 ~35-45 分制），
 * 直接比「差幾分」會把 PolyU 差 20 分（≈ -10%）排到 CityU 差 6 分（≈ -15%）後面，
 * 所以跨校排序一律用這個無單位的比例。
 */
function gapRatio(score, median) {
  if (median == null || median <= 0) return null;
  return +((score - median) / median).toFixed(4);
}

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
        gapRatio: gapRatio(score, median),
        tier,
        scoreComparable: programme.scoreComparable !== false,
        scaleNote: programme.scaleNote || null,
        requirementOk: requirement.ok,
        requirementReasons: requirement.reasons,
        breakdown,
      };
    });

  // 先按配對等級，再按「相對中位數的差距」由小到大排——差得越遠越後面。
  results.sort((a, b) => {
    if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    const ra = a.gapRatio ?? NO_RATIO;
    const rb = b.gapRatio ?? NO_RATIO;
    if (ra !== rb) return rb - ra;
    return (a.jupasCode || '').localeCompare(b.jupasCode || '');
  });

  return results;
}

export { classify, gapRatio, TIER_ORDER };
