// 把 descriptions.json 內的英文官方簡介逐段翻譯成繁體中文（z / zr 欄位）。
// 簡體由前端 t2s 轉換器自動生成，毋須另存。
// 已翻譯過的條目會跳過（可斷點續跑）。
import fs from 'fs';
import path from 'path';

const FILE = path.resolve('../frontend/public/descriptions.json');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tr(text) {
  // 過長段落按句拆開，避免 URL 超限
  if (text.length > 1500) {
    const parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [text];
    let out = '', buf = '';
    for (const s of parts) {
      if ((buf + s).length > 1400) { out += await tr(buf); buf = s; }
      else buf += s;
    }
    if (buf) out += await tr(buf);
    return out;
  }
  const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=' + encodeURIComponent(text);
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) throw new Error(String(r.status));
      const j = await r.json();
      return j[0].map((x) => x[0]).join('');
    } catch (e) {
      if (a === 2) throw e;
      await sleep(1500 * (a + 1));
    }
  }
}

// 並行處理（8 個 worker），可斷點續跑
const queue = Object.keys(data).filter((c) => !(data[c].z && data[c].z.length === data[c].d.length));
const total = Object.keys(data).length;
let done = 0, fail = 0;

async function worker() {
  while (queue.length) {
    const code = queue.shift();
    const e = data[code];
    try {
      const z = [];
      for (const p of e.d) { z.push(await tr(p)); await sleep(60); }
      e.z = z;
      if (e.r && !e.zr) e.zr = await tr(e.r);
      done++;
      if (done % 10 === 0) { fs.writeFileSync(FILE, JSON.stringify(data)); process.stdout.write(`[${done}]`); }
      else process.stdout.write('.');
    } catch (err) {
      fail++;
      process.stdout.write('x');
      await sleep(1500);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, worker));
fs.writeFileSync(FILE, JSON.stringify(data));
const kb = (fs.statSync(FILE).size / 1024).toFixed(0);
console.log(`\n完成：本輪翻譯 ${done}、失敗 ${fail}（總 ${total}）→ ${kb} KB`);
const missing = Object.keys(data).filter((c) => !(data[c].z && data[c].z.length === data[c].d.length));
console.log(`尚未翻譯：${missing.length}${missing.length ? ' → ' + missing.slice(0, 10).join(',') : ''}`);
