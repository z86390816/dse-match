// 繁→簡字元轉換（簡體模式用）。字表 t2s.json 由 data-pipeline/gen_t2s.mjs 生成。
// 為免拖慢繁/英使用者，字表在首次切到簡體時才動態載入。
let MAP = null;
let loading = null;

export function ensureT2S() {
  if (MAP) return Promise.resolve(MAP);
  if (!loading) loading = import('./t2s.json').then((m) => { MAP = m.default || m; return MAP; });
  return loading;
}

export function t2sReady() {
  return MAP != null;
}

// 逐字轉換；字表未載入或非字串時原樣返回。
export function toSimplified(str) {
  if (MAP == null || typeof str !== 'string') return str;
  let out = '';
  for (const ch of str) out += MAP[ch] || ch;
  return out;
}
