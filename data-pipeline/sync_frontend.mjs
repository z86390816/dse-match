// 把後端靜態資料同步到前端（前端已全靜態、無後端）。
// 每次重新生成 programmes/disciplines/applications 後執行：node sync_frontend.mjs
import fs from 'fs';
import path from 'path';

const B = path.resolve('../backend/src/data');
const F = path.resolve('../frontend/src/data');
const PUB = path.resolve('../frontend/public');

fs.mkdirSync(F, { recursive: true });
fs.copyFileSync(path.join(B, 'programmes.json'), path.join(F, 'programmes.json'));
fs.copyFileSync(path.join(B, 'disciplines.json'), path.join(F, 'disciplines.json'));
fs.copyFileSync(path.join(B, 'applications.json'), path.join(PUB, 'applications.json'));

console.log('已同步 programmes.json、disciplines.json → frontend/src/data；applications.json → frontend/public');
console.log('注意：subjects.js 與 universities.js 為手寫，更新後請同步 frontend/src/engine/ 對應檔。');
