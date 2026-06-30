// DSE 科目定義與等級換分表（前端版，與後端同源）。
export const GRADE_SCHEMES = {
  standard: { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0 },
  bonusTop: { '5**': 8.5, '5*': 7, '5': 5.5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0 },
};

export const CSD_GRADES = ['達標', '未達標'];

export const SUBJECTS = [
  { id: 'chin', name: '中國語文', en: 'Chinese Language', core: true, category: 'language' },
  { id: 'eng', name: '英國語文', en: 'English Language', core: true, category: 'language' },
  { id: 'math', name: '數學（必修部分）', en: 'Mathematics (Compulsory)', core: true, category: 'math' },
  { id: 'csd', name: '公民與社會發展', en: 'Citizenship & Social Development', core: true, category: 'humanities', passFail: true },

  { id: 'm1', name: '數學延伸 M1（微積分與統計）', en: 'Mathematics Extended M1', core: false, category: 'math' },
  { id: 'm2', name: '數學延伸 M2（代數與微積分）', en: 'Mathematics Extended M2', core: false, category: 'math' },

  { id: 'phys', name: '物理', en: 'Physics', core: false, category: 'science' },
  { id: 'chem', name: '化學', en: 'Chemistry', core: false, category: 'science' },
  { id: 'bio', name: '生物', en: 'Biology', core: false, category: 'science' },
  { id: 'cit', name: '組合科學', en: 'Combined Science', core: false, category: 'science' },
  { id: 'ist', name: '綜合科學', en: 'Integrated Science', core: false, category: 'science' },

  { id: 'econ', name: '經濟', en: 'Economics', core: false, category: 'business' },
  { id: 'bafs', name: '企業、會計與財務概論 (BAFS)', en: 'Business, Accounting & Financial Studies', core: false, category: 'business' },
  { id: 'ths', name: '旅遊與款待', en: 'Tourism & Hospitality Studies', core: false, category: 'business' },

  { id: 'geog', name: '地理', en: 'Geography', core: false, category: 'humanities' },
  { id: 'hist', name: '歷史', en: 'History', core: false, category: 'humanities' },
  { id: 'chist', name: '中國歷史', en: 'Chinese History', core: false, category: 'humanities' },
  { id: 'chlit', name: '中國文學', en: 'Chinese Literature', core: false, category: 'humanities' },
  { id: 'englit', name: '英語文學', en: 'Literature in English', core: false, category: 'humanities' },
  { id: 'ethics', name: '倫理與宗教', en: 'Ethics & Religious Studies', core: false, category: 'humanities' },

  { id: 'ict', name: '資訊及通訊科技 (ICT)', en: 'Information & Communication Technology', core: false, category: 'science' },
  { id: 'dat', name: '設計與應用科技 (DAT)', en: 'Design & Applied Technology', core: false, category: 'science' },
  { id: 'hmsc', name: '健康管理與社會關懷', en: 'Health Management & Social Care', core: false, category: 'social' },
  { id: 'tl', name: '科技與生活', en: 'Technology & Living', core: false, category: 'science' },

  { id: 'va', name: '視覺藝術', en: 'Visual Arts', core: false, category: 'arts' },
  { id: 'music', name: '音樂', en: 'Music', core: false, category: 'arts' },
  { id: 'pe', name: '體育', en: 'Physical Education', core: false, category: 'arts' },
];

export const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));
export const GRADE_OPTIONS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
