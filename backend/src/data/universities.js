// 香港 JUPAS 院校清單
//
// gradeScheme 指向 subjects.js 的 GRADE_SCHEMES，
// 代表該院校把 DSE 等級換成分數時用哪張表。
// 注意：真實情況下不少院校甚至每個課程的換分／加權都不同，
// 因此 programmes.json 內每個專業仍可覆寫 weights / scheme。

const UNIVERSITIES = [
  { id: 'hku', name: '香港大學', en: 'The University of Hong Kong', short: 'HKU', gradeScheme: 'bonusTop' },
  { id: 'cuhk', name: '香港中文大學', en: 'The Chinese University of Hong Kong', short: 'CUHK', gradeScheme: 'bonusTop' },
  { id: 'hkust', name: '香港科技大學', en: 'The Hong Kong University of Science and Technology', short: 'HKUST', gradeScheme: 'bonusTop' },
  { id: 'polyu', name: '香港理工大學', en: 'The Hong Kong Polytechnic University', short: 'PolyU', gradeScheme: 'bonusTop' },
  { id: 'cityu', name: '香港城市大學', en: 'City University of Hong Kong', short: 'CityU', gradeScheme: 'bonusTop' },
  { id: 'hkbu', name: '香港浸會大學', en: 'Hong Kong Baptist University', short: 'HKBU', gradeScheme: 'standard' },
  { id: 'eduhk', name: '香港教育大學', en: 'The Education University of Hong Kong', short: 'EdUHK', gradeScheme: 'standard' },
  { id: 'lingnan', name: '嶺南大學', en: 'Lingnan University', short: 'LU', gradeScheme: 'standard' },
  { id: 'hkmu', name: '香港都會大學', en: 'Hong Kong Metropolitan University', short: 'HKMU', gradeScheme: 'standard' },
].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i); // 去重保險

const UNIVERSITY_MAP = Object.fromEntries(UNIVERSITIES.map((u) => [u.id, u]));

module.exports = { UNIVERSITIES, UNIVERSITY_MAP };
