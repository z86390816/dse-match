const express = require('express');
const router = express.Router();

const {
  SUBJECTS, UNIVERSITIES, PROGRAMMES, DATA_YEAR, GRADE_OPTIONS, CSD_GRADES,
} = require('../data');
const { GRADE_SCHEMES } = require('../data/subjects');
const { matchAll } = require('../services/matcher');
const { recommend, INTEREST_TO_CATEGORY } = require('../services/recommender');

// --- 元資料 ---
router.get('/subjects', (req, res) => {
  res.json({ subjects: SUBJECTS, gradeOptions: GRADE_OPTIONS, csdGrades: CSD_GRADES, gradeSchemes: GRADE_SCHEMES });
});

router.get('/universities', (req, res) => {
  res.json({ universities: UNIVERSITIES });
});

router.get('/programmes', (req, res) => {
  res.json({ year: DATA_YEAR, count: PROGRAMMES.length, programmes: PROGRAMMES });
});

router.get('/interests', (req, res) => {
  res.json({ interests: Object.keys(INTEREST_TO_CATEGORY) });
});

// --- 配對 ---
// body: { grades: { eng:'5', math:'5*', ... csd:'達標' } }
router.post('/match', (req, res) => {
  const { grades } = req.body || {};
  if (!grades || typeof grades !== 'object') {
    return res.status(400).json({ error: 'grades 為必填物件，例 { "eng": "5", "math": "5*" }' });
  }
  const results = matchAll(grades, PROGRAMMES);
  res.json({ year: DATA_YEAR, dataNotice: '收生分數為示例數據，待官方核實', results });
});

// --- 推薦 ---
// body: { grades:{...}, interests:['science','business'], onlyAttainable:true }
router.post('/recommend', (req, res) => {
  const { grades, interests, onlyAttainable } = req.body || {};
  if (!grades || typeof grades !== 'object') {
    return res.status(400).json({ error: 'grades 為必填物件' });
  }
  const results = recommend(grades, interests, PROGRAMMES, { onlyAttainable: !!onlyAttainable });
  res.json({ year: DATA_YEAR, dataNotice: '收生分數為示例數據，待官方核實', results });
});

module.exports = router;
