# 數據管線 (Data Pipeline)

把 JUPAS 官方 2025 收生分數 PDF 解析成 `backend/src/data/programmes.json`。

## 數據來源（公開官方 PDF）

| 來源 | URL |
|------|-----|
| **JUPAS 9 校合集（主來源）** | https://www.jupas.edu.hk/f/page/3667/af_2025_JUPAS.pdf |
| HKU 收生分數 | https://admissions.hku.hk/sites/default/files/2024-10/HKU-JUPAS-Admissions-Scores-2024.pdf |
| HKU 計分公式 | https://admissions.hku.hk/sites/default/files/2024-05/HKU_Expected_Score_2024.pdf |
| CUHK | https://admission.cuhk.edu.hk/wp-content/uploads/2025/05/Admission-Grades-2025.pdf |
| HKUST | https://join.hkust.edu.hk/docs/2025_HKUST_JUPAS_ADMISSIONS_SCORES.pdf |
| HKMU | https://www.hkmu.edu.hk/REG/reg_ftae/Admission/Scores_JUPAS.pdf |

合集 PDF（44 頁）每個專業都有：JS code、課程名、計分公式、科目加權、Median、Lower Quartile。
2025 新換分表：**5\*\*=8.5, 5\*=7, 5=5.5, 4=4, 3=3, 2=2, 1=1**（即引擎的 `bonusTop` scheme）。

## 用法

```bash
cd data-pipeline
npm install pdfjs-dist@4         # 座標抽取（不需 Python）
# 下載合集 PDF 到本目錄為 jupas_all_2025.pdf
node diag.mjs                    # 每頁 → 院校 + JS code 抽樣（定位各校頁碼）
node extract.mjs jupas_all_2025.pdf 2 2   # 看單頁每個 token 的 x,y 座標
node parse_cityu.mjs             # 解析 CityU(p2-8) → cityu.json（引擎格式）
```

## ⚠️ 重點：5 所主要大學各用不同尺度與版面，需各寫一個 parser

| 院校 | 頁碼 | 分數欄 | 尺度 | 公式 | JS code 特徵 |
|------|------|--------|------|------|------|
| CityU | 2–8 | Median, LQ | ~20–50 | Best-N + 加權清單 | x≈55 |
| HKBU | 9–15 | Median, LQ | — | — | x≈57，被拆 (JS202+0) |
| Lingnan | 16–17 | — | — | — | JS7xxx |
| CUHK | 18–22 | UQ/M/LQ 三行 | ~20–35 | Best-5 加權總分，逐科 grade 欄 | x≈32 |
| EdUHK | 23–26 | — | — | — | JS8xxx |
| PolyU | 27–33 | Median, LQ | **~200–300** | 百分位 + 加權（公式不在此 PDF） | x≈177 |
| HKUST | 34–36 | Median, LQ | ~30–45 | Best 5 + 6th bonus | 被拆 (JS52+12) |
| HKU | 37–41 | Upper/Median/Lower | ~33–56 | `1.5×Eng+1.5×Math+Best N+0.2×Nth best` | **無 JS 前綴**，數字被拆 (6793) |
| HKMU | 42–44 | Median, LQ | — | — | JS9xxx |

## 進度（全 9 校完成）

`parse_all5.mjs`（9 校解析，名字沿用未改）→ `build_programmes.mjs`（合併、分類、去重、自動把關）
→ `backend/.../programmes.json`。`verify.mjs` 做驗證。**349 個專業**（去重後）。

| 院校 | median/LQ | 計分還原 | scheme |
|------|-----------|----------|--------|
| CityU 57 | ✅ | Best-5 **不加權**（加權欄 bleed 不可靠，已棄） | bonusTop |
| CUHK 70 | ✅ | Best-5 + 乾淨的 `(x N.N)` 加權 | bonusTop（醫科 JS4501/4502 standard） |
| HKUST 33 | ✅ | Best-5 不加權（近似） | bonusTop |
| HKU 54 | ✅ | **線性公式** `a×Eng+b×Math+Best N+tail×第(N+1)`（引擎 method:'hku'） | bonusTop |
| PolyU 45 | ✅ | ~200-300 尺度，公式不公開 → 僅供參考、不評級 | — |
| Lingnan 20 | ✅（LQ 部分缺） | Best-5 不加權 | standard |
| EdUHK 26 | ✅ | Best-5 不加權（加權欄行錯位，已棄） | standard |
| HKBU 22 | ✅（多數無 LQ） | Best-5 不加權，分數＝Mean | standard（推定） |
| HKMU 22 | ✅ | Best-5 不加權（加權欄行錯位，已棄） | standard（推定） |

**去重**：CUHK 三行 UQ/M/LQ 版面會重複擷取同一 code → build 依 uni+code 去重，保留資料最完整一筆（移除 14 筆）。

**自動把關**：build 對每專業算「完美生分數」，若 < median 代表本校公式無法精確複製 → 自動標
`scoreComparable:false`。結果 **192 可精確比對 + 81 僅供參考**（45 PolyU + 36 高分/複雜課程）。

**驗證** `node verify.mjs`：id 唯一性 + median≥LQ + 官方抽查（7 校）+ **18 萬次單調性** + 完美/最弱生範圍。
目前 **0 錯誤 0 警告**。

## 申請統計（Band A-E 報名人數）

`scrape_applications.mjs`：逐一抓 JUPAS 各專業頁 `jupas.edu.hk/en/programme/{slug}/{JScode}/`，
解析「Application Statistics (after Modification of Programme Choices)」表的 Band A-E + 總數（多年），
及核心科目最低要求。輸出 `backend/src/data/applications.json`（key = JS code）。

- 院校 slug：cityu→cityuhk、lingnan→lingnanu，其餘同 id。
- Band A=首 3 志願、B=第 4-6、C=7-9、D=10-15、E=16-20。
- 注意：頁面有兩個 Band 表（收生 vs 申請），錨定 `after Modification of Programme Choices` 才是「報名人數」。
- 後端 `/api/applications/:code` 提供；前端瀏覽頁點專業即顯示。

```bash
cd data-pipeline && node scrape_applications.mjs   # ~349 頁，約 2-3 分鐘
```

### 待精修
- 加權還原：CityU/HKUST/EdUHK/HKMU 目前不加權近似；HKU 醫/牙特殊公式；PolyU 官方 200 制公式（需查 PolyU 網站）。
- Lingnan/HKBU 部分 LQ 缺；HKBU/HKMU scheme 為推定（PDF 未明示）。
- 課程名偶有殘留雜訊（PDF 跨欄）。

## 注意

- 過濾雜訊：分數值只取 12~70（排除年份 2025/2026、頁碼）。
- JS code 常被拆成多 token（`JS202`+`0`），需在左欄合併。
- 計分公式必須**逐校複製**，使用者分數才能和該校 median 在同一尺度比較。
