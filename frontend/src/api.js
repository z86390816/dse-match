// 與後端 API 溝通的薄封裝。
const BASE = '/api';

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`GET ${path} 失敗: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `POST ${path} 失敗: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getSubjects: () => get('/subjects'),
  getInterests: () => get('/interests'),
  getProgrammes: () => get('/programmes'),
  getUniversities: () => get('/universities'),
  getApplications: (code) => get(`/applications/${code}`),
  match: (grades) => post('/match', { grades }),
  recommend: (grades, interests, onlyAttainable) =>
    post('/recommend', { grades, interests, onlyAttainable }),
};
