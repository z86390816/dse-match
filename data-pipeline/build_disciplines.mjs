// 為每個專業歸類學科領域，並從維基百科（免費）抓取該領域的中英文簡介，
// 總結後存入 disciplines.json；同時把 discipline key 寫入 programmes.json。
import fs from 'fs';
import path from 'path';

// key, wikiEn, wikiZh, patterns（在課程英文名中按序比對，specific → general）
const DISC = [
  ['medicine', 'Medicine', '醫學', ['mbbs', 'medicine', 'medical science']],
  ['dentistry', 'Dentistry', '牙醫學', ['dental', 'dentistry']],
  ['chinese_medicine', 'Traditional Chinese medicine', '中醫學', ['chinese medicine']],
  ['nursing', 'Nursing', '護理學', ['nursing']],
  ['pharmacy', 'Pharmacy', '藥學', ['pharmacy', 'pharmaceutical']],
  ['physiotherapy', 'Physical therapy', '物理治療', ['physiotherapy', 'physical therapy', 'occupational therapy']],
  ['public_health', 'Public health', '公共衞生', ['public health']],
  ['biomedical', 'Biomedical sciences', '生物醫學', ['biomedical']],
  ['biotechnology', 'Biotechnology', '生物技術', ['biotechnology', 'biotech']],
  ['law', 'Law', '法律', ['laws', 'law', 'juris', 'legal']],
  ['architecture', 'Architecture', '建築學', ['architectur']],
  ['surveying', 'Surveying', '測量學', ['surveying', 'surveyor']],
  ['civil_eng', 'Civil engineering', '土木工程', ['civil engineering', 'civil and']],
  ['mechanical_eng', 'Mechanical engineering', '機械工程', ['mechanical']],
  ['electrical_eng', 'Electrical engineering', '電機工程', ['electrical', 'electronic']],
  ['ai', 'Artificial intelligence', '人工智能', ['artificial intelligence']],
  ['data_science', 'Data science', '數據科學', ['data science', 'data analytics', 'analytics', 'big data']],
  ['computer_science', 'Computer science', '計算機科學', ['computer science', 'computer engineering', 'computing', 'computer', 'cybersecurity', 'cyber security', 'cyber']],
  ['information_tech', 'Information technology', '資訊科技', ['information technology', 'information systems', 'information engineering', 'information management']],
  ['accounting', 'Accounting', '會計學', ['accounting', 'accountancy']],
  ['actuarial', 'Actuarial science', '精算學', ['actuarial']],
  ['finance', 'Finance', '金融學', ['finance', 'financial']],
  ['economics', 'Economics', '經濟學', ['economics', 'economic']],
  ['marketing', 'Marketing', '市場營銷', ['marketing']],
  ['hospitality', 'Hospitality management studies', '酒店管理', ['hospitality', 'hotel', 'tourism']],
  ['management', 'Management', '管理學', ['management', 'administration']],
  ['psychology', 'Psychology', '心理學', ['psychology', 'psychological']],
  ['social_work', 'Social work', '社會工作', ['social work']],
  ['sociology', 'Sociology', '社會學', ['sociology']],
  ['political_science', 'Political science', '政治學', ['political', 'government and public', 'international relations', 'public policy', 'public administration', 'governance']],
  ['journalism', 'Journalism', '新聞學', ['journalism']],
  ['communication', 'Communication studies', '傳播學', ['communication', 'media']],
  ['translation', 'Translation', '翻譯', ['translation', 'translating']],
  ['linguistics', 'Linguistics', '語言學', ['linguistic']],
  ['chinese', 'Chinese language', '漢語', ['chinese language', 'chinese studies', 'chinese and']],
  ['english', 'English studies', '英語', ['english language', 'english studies', 'english for', 'english']],
  ['history', 'History', '歷史學', ['history']],
  ['philosophy', 'Philosophy', '哲學', ['philosophy']],
  ['geography', 'Geography', '地理學', ['geography', 'geographic']],
  ['anthropology', 'Anthropology', '人類學', ['anthropology']],
  ['chemistry', 'Chemistry', '化學', ['chemistry', 'chemical']],
  ['physics', 'Physics', '物理學', ['physics']],
  ['mathematics', 'Mathematics', '數學', ['mathematics', 'mathematical']],
  ['statistics', 'Statistics', '統計學', ['statistic', 'quantitative finance']],
  ['environmental', 'Environmental science', '環境科學', ['environmental', 'environment']],
  ['food_science', 'Food science', '食品科學', ['food and', 'food science', 'nutrition']],
  ['biology', 'Biology', '生物學', ['biology', 'biological', 'life science']],
  ['music', 'Music', '音樂', ['music']],
  ['design', 'Design', '設計', ['design']],
  ['fine_arts', 'Fine art', '美術', ['fine art', 'visual art', 'creative arts', 'creative media']],
  ['sports', 'Exercise physiology', '運動科學', ['sport', 'exercise', 'physical education']],
  ['urban_planning', 'Urban planning', '城市規劃', ['urban', 'planning']],
  ['education', 'Education', '教育學', ['education', 'teaching']],
  ['engineering', 'Engineering', '工程學', ['engineering']],
  ['business', 'Business administration', '工商管理', ['business', 'commerce', 'entrepreneurship']],
  ['social_science', 'Social science', '社會科學', ['social science', 'social sciences']],
  ['science', 'Science', '科學', ['science']],
  ['humanities', 'Humanities', '人文學科', ['arts', 'humanities']],
];

function matchDiscipline(name) {
  const n = name.toLowerCase();
  for (const [key, , , pats] of DISC) for (const p of pats) if (n.includes(p)) return key;
  return 'humanities';
}

function trim(text, max = 220) {
  if (!text) return null;
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  // 在句號處截斷
  const cut = text.slice(0, max);
  const lastEn = cut.lastIndexOf('. '); const lastZh = cut.lastIndexOf('。');
  const at = Math.max(lastEn, lastZh);
  return (at > 60 ? cut.slice(0, at + 1) : cut).trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'DSEMarks/1.0 (https://dsemarks.com; HK DSE programme info)';

async function wiki(lang, title) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) { await sleep(1500); continue; }
      if (!res.ok) return null;
      const j = await res.json();
      if (j.type === 'disambiguation' || !j.extract) return null;
      return trim(j.extract);
    } catch { await sleep(500); }
  }
  return null;
}

const disciplines = {};
let ok = 0;
for (const [key, wikiEn, wikiZh] of DISC) {
  const en = await wiki('en', wikiEn);
  await sleep(300);
  const zh = await wiki('zh', wikiZh);
  await sleep(300);
  disciplines[key] = { nameEn: wikiEn, nameZh: wikiZh, en, zh };
  if (en || zh) ok++;
  process.stdout.write(en && zh ? '.' : (en || zh ? '+' : '?'));
}
fs.writeFileSync(path.resolve('../backend/src/data/disciplines.json'), JSON.stringify(disciplines, null, 2));

// 指派 discipline key 到每個專業
const PROG_PATH = path.resolve('../backend/src/data/programmes.json');
const prog = JSON.parse(fs.readFileSync(PROG_PATH, 'utf8'));
for (const p of prog.programmes) p.discipline = matchDiscipline(p.name);
fs.writeFileSync(PROG_PATH, JSON.stringify(prog, null, 2));

console.log(`\n學科領域：${DISC.length} 個，成功抓到簡介 ${ok} 個`);
const dist = {}; prog.programmes.forEach((p) => { dist[p.discipline] = (dist[p.discipline] || 0) + 1; });
console.log('專業分佈（前 15）：', Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k}:${n}`).join(' '));
