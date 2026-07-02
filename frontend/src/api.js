// 全靜態前端：資料與計分引擎都在瀏覽器，無需後端（消除 Render 冷啟動）。
// 重型資料（programmes / disciplines / applications）採惰性載入並快取。
import { SUBJECTS, GRADE_OPTIONS, CSD_GRADES, GRADE_SCHEMES } from './engine/subjects.js';
import { UNIVERSITIES } from './engine/universities.js';
import { matchAll } from './engine/matcher.js';
import { recommend, INTEREST_TO_CATEGORY } from './engine/recommender.js';

let _prog, _disc, _apps, _desc;
const loadProgrammes = () => (_prog ||= import('./data/programmes.json').then((m) => m.default));
const loadDisciplines = () => (_disc ||= import('./data/disciplines.json').then((m) => m.default));
const loadApplications = () => (_apps ||= fetch('/applications.json').then((r) => r.json()));
const loadDescriptions = () => (_desc ||= fetch('/descriptions.json').then((r) => r.json()));

export const api = {
  getSubjects: async () => ({ subjects: SUBJECTS, gradeOptions: GRADE_OPTIONS, csdGrades: CSD_GRADES, gradeSchemes: GRADE_SCHEMES }),
  getInterests: async () => ({ interests: Object.keys(INTEREST_TO_CATEGORY) }),
  getUniversities: async () => ({ universities: UNIVERSITIES }),
  getProgrammes: async () => {
    const p = await loadProgrammes();
    return { year: p.year, count: p.programmes.length, programmes: p.programmes };
  },
  getDisciplines: async () => ({ disciplines: await loadDisciplines() }),
  getApplications: async (code) => {
    const a = await loadApplications();
    return { code, application: a[code] || null };
  },
  // 官方課程簡介（爬自 JUPAS）：{ d:[段落], w:官網, r:備註 }
  getDescription: async (code) => {
    const d = await loadDescriptions().catch(() => ({}));
    return d[code] || null;
  },
  match: async (grades) => {
    const p = await loadProgrammes();
    return { year: p.year, results: matchAll(grades, p.programmes) };
  },
  recommend: async (grades, interests, onlyAttainable) => {
    const p = await loadProgrammes();
    return { year: p.year, results: recommend(grades, interests, p.programmes, { onlyAttainable: !!onlyAttainable }) };
  },
  // 首屏後背景預載，讓首次比對/瀏覽即時
  prefetch: () => { loadProgrammes(); loadDisciplines(); },
  // 記錄學科/專業點擊（fire-and-forget，失敗不影響體驗）
  track: (discipline, jupasCode) => {
    try {
      fetch('/api/track', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline: discipline || '', jupasCode: jupasCode || '' }),
      }).catch(() => {});
    } catch { /* ignore */ }
  },
  // 上報數據錯誤
  report: async ({ programme, message, contact, lang }) => {
    const r = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programme, message, contact, lang }),
    });
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  },
};
