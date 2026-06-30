import { createContext, useContext, useEffect, useState } from 'react';

// 雙語字典。key 為穩定語意鍵；院校/科目/專業名直接用資料內的 en 欄位。
const STRINGS = {
  // ---- header / chrome ----
  appTitle: { zh: '🎓 DSE 收生分數比對', en: '🎓 DSE Score Match' },
  appSub: {
    zh: '輸入你的 DSE 成績，看看能配對哪些香港大學專業（2025 年數據）',
    en: 'Enter your DSE results to see which university programmes you match (2025 data)',
  },
  notice: {
    zh: '收生中位數／上下四分位數來自 JUPAS 官方 2025 數據（全 9 所院校）。分數計算盡量還原各校公式，部分課程（標「僅供參考」）因計分較複雜未能精確比對。結果僅供參考，請以官方為準。',
    en: 'Median / upper & lower quartile scores are from official JUPAS 2025 data (all 9 institutions). Scores replicate each institution’s formula where possible; some programmes (marked “reference”) cannot be compared precisely. For reference only — always verify with official sources.',
  },
  tabMatch: { zh: '🎯 成績比對', en: '🎯 Match' },
  tabBrowse: { zh: '📚 專業錄取分析', en: '📚 Programmes' },

  // ---- score form ----
  coreSubjects: { zh: '必修科目', en: 'Core Subjects' },
  electiveSubjects: { zh: '選修科目（只填你有報考的）', en: 'Electives (only those you took)' },
  interestsTitle: { zh: '興趣（可選，用於推薦）', en: 'Interests (optional, for recommendations)' },
  onlyAttainable: { zh: '只顯示有機會入到的（穩陣 / 有機會 / 衝刺）', en: 'Show only attainable (Safe / Likely / Reach)' },
  submit: { zh: '開始比對', en: 'Start Matching' },
  submitting: { zh: '計算中…', en: 'Calculating…' },

  // ---- results ----
  backToEdit: { zh: '← 返回修改成績', en: '← Back to edit grades' },
  resultsTitle: { zh: '比對結果', en: 'Match Results' },
  programmesUnit: { zh: '個專業', en: 'programmes' },
  filterAll: { zh: '全部', en: 'All' },
  hideOutOfReach: { zh: '只看有機會入到的（穩陣／有機會／衝刺）', en: 'Show only attainable (Safe / Likely / Reach)' },
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
  aiAnalysis: { zh: 'AI 智能分析', en: 'AI Analysis' },
  aiNote: { zh: '＊綜合 JUPAS 報名／取錄／收生分數據及維基百科學科簡介自動生成，僅供參考', en: '* Auto-generated from JUPAS application / offer / score data and Wikipedia field summaries — for reference only' },
  careerHeading: { zh: '出路概覽', en: 'Career Outlook' },
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
  expandTable: { zh: '展開表格', en: 'Show table' },
  collapseTable: { zh: '收起表格', en: 'Hide table' },
  trendTotal: { zh: '總報名', en: 'Total' },
  trendBandA: { zh: 'Band A（首 3 志願）', en: 'Band A (top 3 choices)' },
  back: { zh: '← 返回', en: '← Back' },

  // ---- footer / ads / legal ----
  privacyLink: { zh: '私隱政策', en: 'Privacy Policy' },
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

const LangContext = createContext({ lang: 'zh', t: (k) => k, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh');
  useEffect(() => { localStorage.setItem('lang', lang); document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en'; }, [lang]);
  const t = (key) => (STRINGS[key]?.[lang] ?? STRINGS[key]?.zh ?? key);
  t.cat = (c) => (CATS[c]?.[lang] ?? c);
  t.tier = (tier) => ({ label: TIERS[tier]?.label?.[lang] ?? tier, desc: TIERS[tier]?.desc?.[lang] ?? '' });
  t.sep = lang === 'en' ? ': ' : '：'; // 標籤分隔符（英文用半形冒號）
  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
