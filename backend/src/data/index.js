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

module.exports = {
  SUBJECTS,
  SUBJECT_MAP,
  GRADE_OPTIONS,
  CSD_GRADES,
  UNIVERSITIES,
  UNIVERSITY_MAP,
  PROGRAMMES,
  DATA_YEAR,
};
