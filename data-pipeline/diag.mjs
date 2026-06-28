import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
const data = new Uint8Array(fs.readFileSync('jupas_all_2025.pdf'));
const doc = await getDocument({ data, verbosity: 0 }).promise;
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const txt = tc.items.map((i) => i.str).join(' ');
  const head = (txt.match(/(City University|Baptist|Lingnan|Chinese University|Education University|Polytechnic|University of Science|The University of Hong Kong|Metropolitan)[^|]*?(?=2025)/) || ['?'])[0].trim().slice(0, 35);
  const js = (txt.match(/JS\d{4}/g) || []).slice(0, 3).join(',');
  console.log(`p${String(p).padStart(2)}  ${head.padEnd(36)} JS:[${js}]`);
}
