// 興趣推薦（前端版，與後端同源）。
import { matchAll } from './matcher.js';

export const INTEREST_TO_CATEGORY = {
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

export function recommend(grades, interests, programmes, opts = {}) {
  const wanted = new Set((interests || []).flatMap((i) => INTEREST_TO_CATEGORY[i] || [i]));
  const matched = matchAll(grades, programmes);

  let filtered = matched;
  if (wanted.size > 0) filtered = matched.filter((m) => wanted.has(m.category));
  if (opts.onlyAttainable) filtered = filtered.filter((m) => ['safe', 'competitive', 'reach'].includes(m.tier));

  return filtered.map((m) => ({ ...m, interestMatch: wanted.size === 0 ? null : wanted.has(m.category) }));
}
