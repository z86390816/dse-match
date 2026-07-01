// 程序化 SEO：build 後為每個專業／院校生成可被 Google 收錄的靜態 HTML，
// 內含真實收生數據、報名取錄、就業分析，並導流回計分器。輸出到 dist/。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UNIVERSITIES, UNIVERSITY_MAP } from './src/engine/universities.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = (p) => path.join(__dirname, p);
const SITE = 'https://dsemarks.com';

const programmes = JSON.parse(fs.readFileSync(R('src/data/programmes.json'), 'utf8')).programmes;
const disciplines = JSON.parse(fs.readFileSync(R('src/data/disciplines.json'), 'utf8'));
let applications = {};
try { applications = JSON.parse(fs.readFileSync(R('public/applications.json'), 'utf8')); } catch {}

const CAT_ZH = { medical: '醫科/護理', law: '法律', business: '商科', engineering: '工程', it: '資訊科技', science: '理科', social: '社會科學', arts: '藝術', humanities: '人文', education: '教育', language: '語言', general: '其他' };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `*{box-sizing:border-box}body{margin:0;font-family:-apple-system,"Segoe UI","Microsoft JhengHei","PingFang HK",sans-serif;background:#eef2f7;color:#0f1b2d;line-height:1.6}
a{color:#2563eb}.wrap{max-width:760px;margin:0 auto;padding:16px 16px 48px}
.top{background:linear-gradient(135deg,#1e3a8a,#2563eb 60%,#3b82f6);color:#fff;border-radius:14px;padding:16px 18px;margin-bottom:16px}
.top a{color:#fff;font-weight:800;text-decoration:none;font-size:18px}
.crumb{font-size:13px;color:#5b6b80;margin:2px 0 10px}
h1{font-size:24px;margin:6px 0 2px}.sub{color:#5b6b80;margin:0 0 14px;font-size:14px}
.card{background:#fff;border:1px solid #e3e9f0;border-radius:14px;padding:16px;margin-bottom:14px;box-shadow:0 1px 3px rgba(15,27,45,.06)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
.stat{background:#f5f8fc;border:1px solid #e3e9f0;border-radius:10px;padding:12px;text-align:center}
.stat .n{font-size:26px;font-weight:800;color:#2563eb}.stat.adm .n{color:#ea580c}.stat .l{font-size:12px;color:#5b6b80}
h2{font-size:16px;color:#2563eb;margin:2px 0 8px}.muted{color:#5b6b80;font-size:13px}
.cta{display:block;text-align:center;background:linear-gradient(135deg,#3b82f6,#2563eb 55%,#1e40af);color:#fff;font-weight:800;font-size:17px;text-decoration:none;padding:15px;border-radius:14px;margin:6px 0 14px;box-shadow:0 4px 14px rgba(37,99,235,.35)}
.chips a{display:inline-block;background:#fff;border:1px solid #e3e9f0;border-radius:999px;padding:6px 12px;margin:4px 6px 0 0;font-size:13px;text-decoration:none;color:#0f1b2d}
.req{display:inline-block;background:#f5f8fc;border:1px solid #e3e9f0;border-radius:8px;padding:4px 10px;margin:4px 6px 0 0;font-size:13px}
.career{background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1px solid #fed7aa;border-left:3px solid #ea580c;border-radius:10px;padding:12px 14px}
footer{color:#5b6b80;font-size:12px;text-align:center;margin-top:20px;border-top:1px solid #e3e9f0;padding-top:14px}`;

function shell({ title, desc, canonical, jsonld, body }) {
  return `<!doctype html><html lang="zh-HK"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og-image.png"><meta name="twitter:card" content="summary_large_image">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
<style>${STYLE}</style></head><body><div class="wrap">
<div class="top"><a href="${SITE}/">🎓 JUPAS Calculator</a></div>
${body}
<footer>資料整理自 JUPAS 及各院校 2025 公開數據，僅供參考，以官方公布為準。<br>© ${new Date().getFullYear()} JUPAS Calculator · <a href="${SITE}/">DSE 收生分數比對</a></footer>
</div></body></html>`;
}

function progPage(p) {
  const uni = UNIVERSITY_MAP[p.universityId] || {};
  const a = applications[p.jupasCode] || {};
  const disc = disciplines[p.discipline] || {};
  const nameZh = p.nameZh || p.name;
  const b25 = a.bands?.['2025'];
  const med = p.admission?.median, lq = p.admission?.lowerQuartile, uq = p.admission?.upperQuartile;
  const title = `${nameZh}（${p.jupasCode}）2025 收生分數・取錄人數 | ${uni.short} JUPAS`;
  const desc = `${uni.name} ${nameZh}（${p.jupasCode}）2025 收生中位數${med != null ? ' ' + med : '未公佈'}${p.admitted2025 > 0 ? `、取錄 ${p.admitted2025} 人` : ''}。JUPAS 計分方法、報名人數與就業前景分析。`;
  const canonical = `${SITE}/p/${p.jupasCode}/`;

  const stats = [];
  if (uq != null) stats.push(`<div class="stat"><div class="n">${uq}</div><div class="l">上四分位數</div></div>`);
  if (med != null) stats.push(`<div class="stat"><div class="n">${med}</div><div class="l">收生中位數</div></div>`);
  if (lq != null) stats.push(`<div class="stat"><div class="n">${lq}</div><div class="l">下四分位數</div></div>`);
  if (p.admitted2025 > 0) stats.push(`<div class="stat adm"><div class="n">${p.admitted2025}</div><div class="l">2025 取錄人數</div></div>`);
  if (p.intake > 0) stats.push(`<div class="stat"><div class="n">${p.intake}</div><div class="l">首年學額</div></div>`);

  const reqs = (a.requirements || []).map((r) => `<span class="req">${esc(r.subject)}：${/CITIZENSHIP/i.test(r.subject) ? '達標' : esc(r.min)}</span>`).join('');
  const siblings = programmes.filter((x) => x.universityId === p.universityId && x.jupasCode !== p.jupasCode).slice(0, 8)
    .map((x) => `<a href="${SITE}/p/${x.jupasCode}/">${esc(x.nameZh || x.name)}</a>`).join('');

  const body = `
<nav class="crumb"><a href="${SITE}/u/${p.universityId}/">${esc(uni.name)}</a> › ${esc(p.jupasCode)}</nav>
<h1>${esc(nameZh)}</h1>
<p class="sub">${esc(uni.name)}（${esc(uni.short)}）· ${esc(p.jupasCode)} · ${CAT_ZH[p.category] || ''}<br>${esc(p.name)}</p>
${stats.length ? `<div class="card"><h2>2025 收生數據</h2><div class="grid">${stats.join('')}</div></div>` : ''}
<a class="cta" href="${SITE}/">🎯 用你的 DSE 成績，睇下你能唔能入呢科 →</a>
${reqs ? `<div class="card"><h2>核心科目最低要求</h2>${reqs}</div>` : ''}
${b25 ? `<div class="card"><h2>2025 報名人數（改選後）</h2><p>總報名 <strong>${b25.total}</strong> 人，其中以首三志願（Band A）報讀 <strong>${b25.bandA}</strong> 人。</p></div>` : ''}
${disc.zh ? `<div class="card"><h2>學科簡介</h2><p class="muted">${esc(disc.zh)}</p></div>` : ''}
${disc.careerZh ? `<div class="card"><h2>💼 香港就業前景與方向</h2><div class="career">${esc(disc.careerZh)}</div></div>` : ''}
${siblings ? `<div class="card"><h2>${esc(uni.short)} 其他專業</h2><div class="chips">${siblings}</div></div>` : ''}`;

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Course',
    name: nameZh, description: desc, url: canonical,
    provider: { '@type': 'CollegeOrUniversity', name: uni.name, sameAs: SITE },
  };
  return shell({ title, desc, canonical, jsonld, body });
}

function uniPage(uni) {
  const list = programmes.filter((p) => p.universityId === uni.id).sort((a, b) => (a.jupasCode || '').localeCompare(b.jupasCode || ''));
  const canonical = `${SITE}/u/${uni.id}/`;
  const rows = list.map((p) => `<tr><td><a href="${SITE}/p/${p.jupasCode}/">${esc(p.nameZh || p.name)}</a><br><span class="muted">${esc(p.jupasCode)}</span></td><td style="text-align:right">${p.admission?.median ?? '—'}</td><td style="text-align:right;color:#ea580c">${p.admitted2025 > 0 ? p.admitted2025 : '—'}</td></tr>`).join('');
  const body = `
<nav class="crumb"><a href="${SITE}/programmes/">所有院校</a> › ${esc(uni.short)}</nav>
<h1>${esc(uni.name)} 收生分數 2025</h1>
<p class="sub">${esc(uni.en)}（${esc(uni.short)}）· 共 ${list.length} 個 JUPAS 專業</p>
<a class="cta" href="${SITE}/">🎯 輸入 DSE 成績，比對 ${esc(uni.short)} 全部專業 →</a>
<div class="card"><table style="width:100%;border-collapse:collapse;font-size:14px">
<thead><tr><th style="text-align:left">專業</th><th style="text-align:right">中位數</th><th style="text-align:right">取錄</th></tr></thead>
<tbody>${rows}</tbody></table></div>`;
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollegeOrUniversity', name: uni.name, alternateName: uni.en, url: canonical };
  return shell({ title: `${uni.name} 收生分數・取錄人數 2025（全 ${list.length} 專業）| JUPAS Calculator`, desc: `${uni.name}（${uni.short}）2025 各 JUPAS 專業收生中位數、取錄人數一覽，並可即時比對你的 DSE 成績。`, canonical, jsonld, body });
}

function hubPage() {
  const canonical = `${SITE}/programmes/`;
  const cards = UNIVERSITIES.map((u) => {
    const n = programmes.filter((p) => p.universityId === u.id).length;
    return `<a href="${SITE}/u/${u.id}/" style="text-decoration:none"><div class="stat"><div class="n" style="font-size:18px">${esc(u.short)}</div><div class="l">${esc(u.name)} · ${n} 專業</div></div></a>`;
  }).join('');
  const body = `<h1>香港九大 JUPAS 收生分數 2025</h1>
<p class="sub">全 9 所 JUPAS 院校 · ${programmes.length} 個專業的收生中位數、取錄人數與就業分析</p>
<a class="cta" href="${SITE}/">🎯 用你的 DSE 成績即時比對全部專業 →</a>
<div class="card"><h2>選擇院校</h2><div class="grid">${cards}</div></div>`;
  return shell({ title: '香港九大 JUPAS 收生分數・取錄人數 2025 | JUPAS Calculator', desc: '全 9 所香港 JUPAS 大學 349 個專業 2025 收生中位數、取錄人數與就業前景分析，輸入 DSE 成績即時比對。', canonical, jsonld: null, body });
}

// ---- 寫檔到 dist ----
const dist = R('dist');
const write = (rel, html) => { const f = path.join(dist, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };

let n = 0;
for (const p of programmes) { write(`p/${p.jupasCode}/index.html`, progPage(p)); n++; }
for (const u of UNIVERSITIES) write(`u/${u.id}/index.html`, uniPage(u));
write('programmes/index.html', hubPage());

// sitemap
const urls = [`${SITE}/`, `${SITE}/programmes/`,
  ...UNIVERSITIES.map((u) => `${SITE}/u/${u.id}/`),
  ...programmes.map((p) => `${SITE}/p/${p.jupasCode}/`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);

console.log(`SEO 生成：${n} 個專業頁 + ${UNIVERSITIES.length} 個院校頁 + 1 hub；sitemap ${urls.length} 條`);
