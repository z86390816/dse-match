const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ name: 'DSE Match API', status: 'ok', docs: '/api/programmes' });
});

app.use('/api', apiRoutes);

// 統一錯誤處理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`✅ DSE Match API 運行於 http://localhost:${PORT}`);
});

module.exports = app;
