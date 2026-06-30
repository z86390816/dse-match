// 配對：把使用者分數和各專業的收生中位數 / 下四分位數比較，分級。

const { calculateScore } = require('./scoreCalculator');
const { UNIVERSITY_MAP } = require('../data/universities');

/**
 * 依使用者分數 vs 收生分數，給一個配對等級。
 *   safe       : 分數 >= 中位數（穩陣）
 *   competitive: 介乎下四分位數與中位數之間（有機會）
 *   reach      : 低於下四分位數但仍 >= minScore（衝刺）
 *   below      : 低於最低收生分
 *   unqualified: 不符必修門檻
 */
function classify(score, programme, requirementOk) {
  // 計分方式無法複製（如 PolyU 200 制）→ 僅供參考，不評級
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

/**
 * 對所有專業跑配對。
 * @param {Object} grades
 * @param {Array} programmes
 * @returns {Array} 已排序的配對結果
 */
function matchAll(grades, programmes) {
  const results = programmes.map((programme) => {
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

  // 先按配對等級，再按「離中位數差距」由高到低
  results.sort((a, b) => {
    if (TIER_ORDER[a.tier] !== TIER_ORDER[b.tier]) {
      return TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    }
    return (b.gapToMedian ?? -999) - (a.gapToMedian ?? -999);
  });

  return results;
}

module.exports = { matchAll, classify, TIER_ORDER };
