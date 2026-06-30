// 香港 JUPAS 院校清單（前端版，與後端同源）。
export const UNIVERSITIES = [
  { id: 'hku', name: '香港大學', en: 'The University of Hong Kong', short: 'HKU', shortZh: '港大', gradeScheme: 'bonusTop' },
  { id: 'cuhk', name: '香港中文大學', en: 'The Chinese University of Hong Kong', short: 'CUHK', shortZh: '中大', gradeScheme: 'bonusTop' },
  { id: 'hkust', name: '香港科技大學', en: 'The Hong Kong University of Science and Technology', short: 'HKUST', shortZh: '科大', gradeScheme: 'bonusTop' },
  { id: 'polyu', name: '香港理工大學', en: 'The Hong Kong Polytechnic University', short: 'PolyU', shortZh: '理大', gradeScheme: 'standard' },
  { id: 'cityu', name: '香港城市大學', en: 'City University of Hong Kong', short: 'CityU', shortZh: '城大', gradeScheme: 'bonusTop' },
  { id: 'hkbu', name: '香港浸會大學', en: 'Hong Kong Baptist University', short: 'HKBU', shortZh: '浸大', gradeScheme: 'standard' },
  { id: 'eduhk', name: '香港教育大學', en: 'The Education University of Hong Kong', short: 'EdUHK', shortZh: '教大', gradeScheme: 'standard' },
  { id: 'lingnan', name: '嶺南大學', en: 'Lingnan University', short: 'LU', shortZh: '嶺大', gradeScheme: 'standard' },
  { id: 'hkmu', name: '香港都會大學', en: 'Hong Kong Metropolitan University', short: 'HKMU', shortZh: '都大', gradeScheme: 'standard' },
];

export const UNIVERSITY_MAP = Object.fromEntries(UNIVERSITIES.map((u) => [u.id, u]));
