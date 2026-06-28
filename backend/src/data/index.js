// 統一載入並導出所有資料。
const fs = require('fs');
const path = require('path');
const { SUBJECTS, SUBJECT_MAP, GRADE_OPTIONS, CSD_GRADES } = require('./subjects');
const { UNIVERSITIES, UNIVERSITY_MAP } = require('./universities');

const programmesRaw = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'programmes.json'), 'utf-8')
);

const PROGRAMMES = programmesRaw.programmes;
const DATA_YEAR = programmesRaw.year;

// 申請統計（Band A-E 報名人數）+ 科目要求，由 data-pipeline/scrape_applications.mjs 產生
let APPLICATIONS = {};
try {
  APPLICATIONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'applications.json'), 'utf-8'));
} catch { /* 尚未抓取時為空 */ }

module.exports = {
  SUBJECTS,
  SUBJECT_MAP,
  GRADE_OPTIONS,
  CSD_GRADES,
  UNIVERSITIES,
  UNIVERSITY_MAP,
  PROGRAMMES,
  DATA_YEAR,
  APPLICATIONS,
};
