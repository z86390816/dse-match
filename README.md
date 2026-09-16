# HK DSE 收生分數比對網站 (DSE Match)

輸入你的 DSE 各科成績，計算每個大學專業的加權分數，並對比 2025 年該專業的**收生中位數 / 下四分位數**，看看你能配對哪些香港大學專業。還能按興趣推薦專業。

## 數據聲明（必讀）

`backend/src/data/programmes.json` 為 **JUPAS 官方 2025 收生數據**（全 9 所院校，共 349 個專業），
由官方 PDF `af_2025_JUPAS.pdf` 解析而來（見 `data-pipeline/`）。

- **收生中位數／下四分位數**：官方數據，已逐校抽查對照 PDF。
- **計分還原**：各校計分尺度／公式不同，盡量還原（HKU 線性公式、CUHK 加權、其餘 best-5）。
  - 334 個專業可精確比對（`scoreComparable: true`）。
  - 15 個因計分過於複雜（加權／Best-6／額外科目）標為「僅供參考」不評級，但照樣列在結果裡。
- **核心科最低要求：暫時唔攔**。`requiredCore` / `requireCsd` 留空，計分引擎的
  `checkRequirements` 因此永遠通過，所有專業一律按分數評級。
  原因：上游 `applications.json` 的 requirements 係 `scrape_applications.mjs` 由
  「Core Subjects」起只掃 600 字抓落嚟，而 JUPAS 頁面該處其實有兩個區塊
  （課程自己的要求 + 大學一般最低要求），於是 52 個專業同一科出現兩次、
  78 個四個核心科唔齊、27 個「公民與社會發展」變成數字等級。
  數據有嚴有鬆，攔人的規則唔可以建喺上面。修好 `parseReqs()` 重新 scrape 後，
  `node data-pipeline/build_requirements.mjs` 會自己驗證並寫入。
- **驗證**：`node data-pipeline/verify.mjs` —— 0 錯誤、31 個警告（全部是 PolyU 尺度提示）、
  17 萬次單調性檢查通過。

結果僅供參考，實際收生以各大學/JUPAS 官方公佈為準。各 `dataStatus`／`weightsStatus` 欄標記了每筆數據的來源與信心。

## 架構（前後台分離）

```
DSE/
├── backend/    # Node + Express API（計分引擎、配對、推薦）
└── frontend/   # React (Vite) 前端介面
```

- 前端只負責介面與互動，所有計分邏輯在後端，方便日後改公式而不動前端。
- 數據與計分規則集中在 `backend/src/data/`，新增院校/專業只需改數據檔。

## 快速開始

```bash
# 後端
cd backend
npm install
npm run dev        # http://localhost:4000

# 前端（另開一個終端）
cd frontend
npm install
npm run dev        # http://localhost:5173
```

前端預設透過 Vite proxy 把 `/api` 轉發到後端 `:4000`。

## API

| Method | Path | 說明 |
|--------|------|------|
| GET  | `/api/subjects`     | DSE 科目清單 |
| GET  | `/api/universities` | 院校清單 |
| GET  | `/api/programmes`   | 所有專業（含計分規則、收生分） |
| POST | `/api/match`        | 傳入成績，回傳各專業計分與配對結果 |
| POST | `/api/recommend`    | 傳入成績 + 興趣標籤，回傳推薦專業 |

## 計分引擎

見 `backend/src/services/scoreCalculator.js`。支援：
- 每個專業自訂計分方式（`best5` / `best6` / `4C+2X` / 自訂科目集）
- 每科加權係數（如某專業英文 ×1.5、數學 ×2）
- 必修 / 最低等級要求（如英文需 Level 3）
- 每院校可自訂等級換分表（5\*\* 是否額外加分）

## 待辦 / Roadmap

- [ ] 用核實數據替換 `programmes.json` 全部 `sample` 標記
- [ ] 擴充至全部 9 所 JUPAS 院校
- [ ] 興趣推薦升級為 AI（接 Claude API）
- [ ] 收藏 / 比較多個專業
