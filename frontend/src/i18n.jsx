import { createContext, useContext, useEffect, useState } from 'react';
import { ensureT2S, t2sReady, toSimplified } from './engine/t2s.js';

// 三語字典：zh=繁體、en=英文、sc=簡體。
// sc 若未提供，會由 zh 自動繁→簡轉換（見 pick()）；只有廣東話口語句子才手寫 sc。
// 院校/科目/專業名直接用資料內欄位，簡體模式下由 t.s() 即時轉換。
const STRINGS = {
  // ---- header / chrome ----
  appTitle: { zh: '🎓 JUPAS Calculator', en: '🎓 JUPAS Calculator' },
  appSub: {
    zh: '輸入你的 DSE 成績，看看能配對哪些香港大學專業（2025 年數據）',
    en: 'Enter your DSE results to see which university programmes you match (2025 data)',
  },
  notice: {
    zh: '收生中位數／上下四分位數來自 JUPAS 官方 2025 數據（全 9 所院校）。分數計算盡量還原各校公式，部分課程（標「僅供參考」）因計分較複雜未能精確比對。結果僅供參考，請以官方為準。',
    en: 'Median / upper & lower quartile scores are from official JUPAS 2025 data (all 9 institutions). Scores replicate each institution’s formula where possible; some programmes (marked “reference”) cannot be compared precisely. For reference only — always verify with official sources.',
  },
  tabMatch: { zh: '🎯 成績比對', en: '🎯 Match' },
  tabBrowse: { zh: '📚 各大專業資訊', sc: '📚 各大专业信息', en: '📚 Programmes' },

  // ---- score form ----
  coreSubjects: { zh: '必修科目', en: 'Core Subjects' },
  electiveSubjects: { zh: '選修科目（只填你有報考的）', en: 'Electives (only those you took)' },
  interestsTitle: { zh: '興趣（可選，用於推薦）', en: 'Interests (optional, for recommendations)' },
  onlyAttainable: { zh: '只顯示有機會入到的（穩陣 / 有機會 / 衝刺）', en: 'Show only attainable (Safe / Likely / Reach)' },
  submit: { zh: '開始比對', en: 'Start Matching' },
  submitting: { zh: '計算中…', en: 'Calculating…' },

  // ---- results ----
  backToEdit: { zh: '← 返回修改成績', en: '← Back to edit grades' },
  shareBtn: { zh: '📸 分享我的結果', en: '📸 Share my result' },
  shareTitle: { zh: '我的 DSE 升學配對', en: 'My DSE Match' },
  shareCta: { zh: '輸入你的成績，睇下你能入邊間 👉', en: 'See which programmes you can get into 👉', sc: '输入你的成绩，看看你能进哪些专业 👉' },
  resultsTitle: { zh: '比對結果', en: 'Match Results' },
  programmesUnit: { zh: '個專業', en: 'programmes' },
  filterAll: { zh: '全部', en: 'All' },
  hideOutOfReach: { zh: '只看有機會入到的（穩陣／有機會／衝刺）', en: 'Show only attainable (Safe / Likely / Reach)' },
  searchResultPlaceholder: { zh: '🔍 搜尋你想讀的專業（中／英文關鍵字）…', en: '🔍 Search programmes you like (keyword)…' },
  searchAllHint: { zh: 'ℹ️ 搜尋會顯示全部符合的專業（包括超出你分數的）', en: 'ℹ️ Search shows all matches, including out-of-reach ones' },
  showingN: { zh: '顯示', en: 'Showing' },
  emptyPrompt: { zh: '填好成績後按「開始比對」，結果會顯示在這裡。', en: 'Enter your grades and tap “Start Matching” — results will appear here.' },
  emptyNoMatch: { zh: '沒有符合條件的專業，試試調整興趣或取消篩選。', en: 'No matching programmes. Try adjusting interests or clearing filters.' },

  // score boxes
  yourScore: { zh: '你的分數', en: 'Your Score' },
  median: { zh: '收生中位數', en: 'Median' },
  upperQuartile: { zh: '上四分位數', en: 'Upper Quartile' },
  lowerQuartile: { zh: '下四分位數', en: 'Lower Quartile' },
  admitted2025: { zh: '2025 取錄人數', en: 'Admitted 2025' },
  admittedShort: { zh: '取錄', en: 'Admit' },
  intakeQuota: { zh: '首年學額', en: 'First-year Intake' },

  // calc detail
  viewCalc: { zh: '📊 查看計分明細', en: '📊 Score breakdown' },
  hideCalc: { zh: '▲ 收起計分明細', en: '▲ Hide breakdown' },
  detailBtn: { zh: '📋 專業詳細資訊', en: '📋 Programme details' },
  calcMethod: { zh: '計分方法', en: 'Method' },
  approxNote: { zh: '（加權近似，未完全還原）', en: ' (approx. weighting)' },
  colSubject: { zh: '科目', en: 'Subject' },
  colGrade: { zh: '等級', en: 'Grade' },
  colPoints: { zh: '基本分', en: 'Points' },
  colWeight: { zh: '權重', en: 'Weight' },
  colScore: { zh: '得分', en: 'Score' },
  totalRow: { zh: '總分', en: 'Total' },
  gradeTable: { zh: '換分表', en: 'Grade scale' },
  distToMedian: { zh: '距中位數', en: 'vs median' },

  // ---- browser ----
  selectInstitution: { zh: '選擇院校', en: 'Select Institution' },
  searchPlaceholder: { zh: '搜尋專業名稱 / JS code…', en: 'Search programme name / JS code…' },
  colIdx: { zh: '#', en: '#' },
  colName: { zh: '專業', en: 'Programme' },
  colCategory: { zh: '類別', en: 'Category' },
  colMedianShort: { zh: '中位數', en: 'Med' },
  colUpperShort: { zh: '上四分', en: 'UQ' },
  colLowerShort: { zh: '下四分', en: 'LQ' },
  colAdmShort: { zh: '錄取人數', en: 'Adm' },
  descTitle: { zh: '課程簡介（官方）', en: 'Official Programme Description' },
  officialSite: { zh: '🔗 課程官方網頁', en: '🔗 Official programme website' },
  remarksLabel: { zh: '備註', en: 'Remarks' },
  descSource: { zh: '＊來源：JUPAS／院校官方課程簡介；中文為機器翻譯，僅供參考，以英文原文為準', en: '* Source: official JUPAS / institution programme description' },
  expandDesc: { zh: '展開全文 ▾', en: 'Read more ▾' },
  collapseDesc: { zh: '收起 ▴', en: 'Show less ▴' },
  aiAnalysis: { zh: 'AI 智能分析', en: 'AI Analysis' },
  aiNote: { zh: '＊綜合 JUPAS 報名／取錄／收生分數據及維基百科學科簡介自動生成，僅供參考', en: '* Auto-generated from JUPAS application / offer / score data and Wikipedia field summaries — for reference only' },
  careerHeading: { zh: '出路概覽', en: 'Career Outlook' },
  careerOutlook: { zh: '香港就業前景與方向', en: 'HK Career Outlook & Advice' },
  scoreScale: { zh: '等級換分', en: 'Grade-to-score conversion' },
  tapForDetail: { zh: '點專業看詳情', en: 'tap a programme for details' },
  scoringMethod: { zh: '計分方法 / 科目權重', en: 'Scoring method / subject weights' },
  weightApproxNote: { zh: '＊此校設有科目加權，此處未完全還原，分數僅供參考。', en: '* This institution weights some subjects; not fully replicated here, so scores are indicative only.' },
  coreReq: { zh: '核心科目最低要求', en: 'Minimum core-subject requirements' },
  applicants: { zh: '報名人數', en: 'Applicants' },
  afterModify: { zh: '改選後', en: 'after choice modification' },
  loading: { zh: '載入中…', en: 'Loading…' },
  noAppData: { zh: '暫無報名統計數據。', en: 'No application statistics available.' },
  totalApplicants: { zh: '總報名', en: 'Total applicants' },
  people: { zh: '人', en: '' },
  trendTitle: { zh: '歷年報名趨勢', en: 'Applicant Trend Over Years' },
  newCodeNote: { zh: 'ℹ️ 此為 2025 年新／重編課程編號，JUPAS 暫無往年數據可作趨勢比較。', en: 'ℹ️ This is a new/restructured 2025 programme code; JUPAS has no earlier-year data for trend comparison.' },
  expandTable: { zh: '展開表格', en: 'Show table' },
  collapseTable: { zh: '收起表格', en: 'Hide table' },
  trendTotal: { zh: '總報名', en: 'Total' },
  trendBandA: { zh: 'Band A（首 3 志願）', en: 'Band A (top 3 choices)' },
  back: { zh: '← 返回', en: '← Back' },

  // ---- report / feedback ----
  reportTitle: { zh: '回報數據錯誤', en: 'Report a data error' },
  reportProgramme: { zh: '相關專業（可選）', en: 'Related programme (optional)' },
  reportMessage: { zh: '問題描述', en: 'What looks wrong?' },
  reportPlaceholder: { zh: '例如：JS4412 的計分權重不對、某科收生中位數有誤…', en: 'e.g. wrong weighting for JS4412, incorrect median for a programme…' },
  reportContact: { zh: '你的聯絡方式（可選，方便我們跟進）', en: 'Your contact (optional, so we can follow up)' },
  reportSend: { zh: '送出回報', en: 'Send report' },
  reportSending: { zh: '送出中…', en: 'Sending…' },
  reportThanks: { zh: '多謝回報！我們會盡快核對並更新。', en: 'Thanks for the report! We’ll review and update soon.' },
  reportFail: { zh: '送出失敗，請改用電郵：', en: 'Failed to send — please email:' },
  reportEmpty: { zh: '請先填寫問題描述', en: 'Please describe the issue first' },
  reportOnDetail: { zh: '🚩 這個專業資料有誤？回報', en: '🚩 Data wrong? Report it' },
  reportOnCalc: { zh: '🚩 發現計分有誤？話我哋知（上報）', sc: '🚩 发现计分有误？告诉我们（上报）', en: '🚩 Scoring looks wrong? Report it' },
  viewOriginal: { zh: '查看英文原文', en: 'View original (EN)' },
  viewTranslated: { zh: '返回中文翻譯', en: 'Back to Chinese' },

  // ---- footer / ads / legal ----
  allProgrammes: { zh: '所有院校／專業', en: 'All programmes' },
  privacyLink: { zh: '私隱政策', en: 'Privacy Policy' },
  feedbackPrompt: { zh: '📮 發現數據不準？回報', en: '📮 Spotted inaccurate data? Report', sc: '📮 发现数据不准？回报' },
  footerDisclaimer: { zh: '· 數據僅供參考，一切以各院校官方公布為準 ·', en: '· For reference only; official institution announcements always prevail ·' },
  adLabel: { zh: '廣告', en: 'Advertisement' },
  adPending: { zh: '版位（設定後自動顯示廣告）', en: ' slot (ads appear here once configured)' },
};

const CATS = {
  medical: { zh: '醫科/護理', en: 'Medicine/Nursing' },
  law: { zh: '法律', en: 'Law' },
  business: { zh: '商科', en: 'Business' },
  engineering: { zh: '工程', en: 'Engineering' },
  it: { zh: '資訊科技', en: 'IT' },
  science: { zh: '理科', en: 'Science' },
  social: { zh: '社會科學', en: 'Social Science' },
  arts: { zh: '藝術', en: 'Arts' },
  humanities: { zh: '人文', en: 'Humanities' },
  education: { zh: '教育', en: 'Education' },
  language: { zh: '語言', en: 'Language' },
  general: { zh: '其他', en: 'Other' },
};

const TIERS = {
  safe: { label: { zh: '穩陣', en: 'Safe' }, desc: { zh: '你的分數 ≥ 收生中位數', en: 'Your score ≥ median' } },
  competitive: { label: { zh: '有機會', en: 'Likely' }, desc: { zh: '介乎下四分位數與中位數之間', en: 'Between lower quartile and median' } },
  reach: { label: { zh: '衝刺', en: 'Reach' }, desc: { zh: '略低於下四分位數，可博一博', en: 'Slightly below lower quartile — worth a try' } },
  below: { label: { zh: '機會偏低', en: 'Below' }, desc: { zh: '低於收生分數', en: 'Below admission scores' } },
  unqualified: { label: { zh: '未符要求', en: 'Unqualified' }, desc: { zh: '未達必修門檻', en: 'Core requirements not met' } },
  reference: { label: { zh: '僅供參考', en: 'Reference' }, desc: { zh: '此校計分方式不同，未能精確比對', en: 'Different scoring — cannot compare precisely' } },
};

export const LANGS = ['zh', 'sc', 'en']; // 繁 / 簡 / 英
const LANG_LABEL = { zh: '繁', sc: '简', en: 'EN' };
export { LANG_LABEL };

const LangContext = createContext({ lang: 'zh', t: (k) => k, setLang: () => {} });

// 依語言從 {zh,en,sc} 詞條取字；sc 缺省時由 zh 繁→簡轉換。
function pick(entry, lang) {
  if (!entry) return undefined;
  if (lang === 'en') return entry.en ?? entry.zh;
  if (lang === 'sc') return entry.sc ?? toSimplified(entry.zh ?? '');
  return entry.zh;
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh');
  const [, forceReady] = useState(t2sReady()); // 簡體字表載入後強制重繪
  useEffect(() => {
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'sc' ? 'zh-CN' : 'zh-HK';
    if (lang === 'sc' && !t2sReady()) ensureT2S().then(() => forceReady(true));
  }, [lang]);

  const t = (key) => pick(STRINGS[key], lang) ?? key;
  t.cat = (c) => pick(CATS[c], lang) ?? c;
  t.tier = (tier) => ({ label: pick(TIERS[tier]?.label, lang) ?? tier, desc: pick(TIERS[tier]?.desc, lang) ?? '' });
  t.s = (txt) => (lang === 'sc' ? toSimplified(txt) : txt); // 動態中文（資料/內嵌）即時轉簡
  t.clang = lang === 'en' ? 'en' : 'zh'; // 內容語言：內嵌繁體建構函式用 zh，再由 t.s 轉簡
  t.sep = lang === 'en' ? ': ' : '：'; // 標籤分隔符（英文用半形冒號）
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
