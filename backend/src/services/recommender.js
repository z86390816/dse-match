// 興趣推薦（MVP：規則式）。
// 之後可升級成 AI（接 Claude API）：把使用者興趣描述 + 成績 + 專業清單丟給模型排序。

const { matchAll } = require('./matcher');

// 興趣標籤 → 對應專業 category
const INTEREST_TO_CATEGORY = {
  science: ['science', 'engineering'],
  business: ['business'],
  medical: ['medical'],
  arts: ['arts', 'humanities'],
  social: ['social', 'humanities'],
  engineering: ['engineering', 'science'],
  it: ['it', 'science'],
  education: ['education'],
  law: ['law'],
  language: ['language', 'humanities'],
};

/**
 * @param {Object} grades
 * @param {string[]} interests  興趣標籤
 * @param {Array} programmes
 * @param {Object} [opts] { onlyAttainable: 只推薦至少「衝刺」可及的 }
 */
function recommend(grades, interests, programmes, opts = {}) {
  const wanted = new Set(
    (interests || []).flatMap((i) => INTEREST_TO_CATEGORY[i] || [i])
  );

  const matched = matchAll(grades, programmes);

  let filtered = matched;
  if (wanted.size > 0) {
    filtered = matched.filter((m) => wanted.has(m.category));
  }
  if (opts.onlyAttainable) {
    filtered = filtered.filter((m) => ['safe', 'competitive', 'reach'].includes(m.tier));
  }

  // 推薦排序：可及 + 興趣吻合者優先（matchAll 已按 tier 排好）
  return filtered.map((m) => ({
    ...m,
    interestMatch: wanted.size === 0 ? null : wanted.has(m.category),
  }));
}

module.exports = { recommend, INTEREST_TO_CATEGORY };
