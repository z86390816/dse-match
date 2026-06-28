// 用 pdfjs 抽出每個 token 的 x,y 座標，重建表格。
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const file = process.argv[2];
const fromPage = parseInt(process.argv[3] || '1');
const toPage = parseInt(process.argv[4] || '999');

const data = new Uint8Array(fs.readFileSync(file));
const doc = await getDocument({ data }).promise;
const last = Math.min(toPage, doc.numPages);

for (let p = fromPage; p <= last; p++) {
  const page = await doc.getPage(p);
  const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  // 每個 item: str + transform[4]=x, transform[5]=y(底部為0)。轉成 top 距離。
  const items = tc.items
    .filter((i) => i.str && i.str.trim() !== '')
    .map((i) => ({
      str: i.str,
      x: +i.transform[4].toFixed(1),
      y: +(vp.height - i.transform[5]).toFixed(1), // top-down
      w: +i.width.toFixed(1),
    }));
  console.log(`\n===== PAGE ${p} (h=${vp.height.toFixed(0)}) =====`);
  // 按 y 分行（容差 3），行內按 x 排序
  const rows = [];
  for (const it of items.sort((a, b) => a.y - b.y || a.x - b.x)) {
    let row = rows.find((r) => Math.abs(r.y - it.y) < 3);
    if (!row) { row = { y: it.y, items: [] }; rows.push(row); }
    row.items.push(it);
  }
  for (const r of rows.sort((a, b) => a.y - b.y)) {
    const line = r.items.sort((a, b) => a.x - b.x)
      .map((i) => `${i.str}@${i.x}`).join('  ');
    console.log(`y${r.y.toFixed(0).padStart(4)}: ${line}`);
  }
}
