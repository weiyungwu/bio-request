# 已知問題與後續開發清單

規格第 8 節交付物之一。每項註明來源與預計處理的任務；處理完畢後從清單移除，並在 commit 訊息註明。

## 延後到對應任務（審查已確認有效，等第一個使用者出現再做，避免先寫用不到的程式碼）

| 項目                                                                                                                            | 處理時機                                      | 來源               |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------ |
| 內文句子中的專有名詞仍可能被斷行（標題與重點整理的名詞已不斷行）；如需要，在教材文字中標記名詞                                  | 教材 Human 審閱後視需要                       | Gemini Phase 0 #6  |
| 測驗 / 配對選項元件：選取、答對、答錯狀態，選項編號與 ✓ / ✗ 圖示                                                                | TASK-008、TASK-011                            | Gemini Phase 0 #2  |
| 提交按鈕停用時顯示原因（如「請先選取答案」）                                                                                    | TASK-011                                      | Gemini Phase 0 #10 |
| `tests/unit/app.spec.ts` 仍使用 router singleton，改為每個測試各自建立 router（Pinia 是否接上 `main.ts` 已由 E2E 首頁測試涵蓋） | 下次修改 app.spec 時                          | TASK-001 審查 S3   |
| EXP 取得規則、防刷分、徽章（`docs/progression.md` §2、§3、§5）                                                                  | TASK-015（測驗分數獎勵隨 TASK-011／012 接上） | 使用者等級設計     |
| 逐筆驗證 LocalStorage 讀入的紀錄欄位（目前首頁只略過日期無效的紀錄）                                                            | TASK-013                                      | TASK-003 審查 I2   |
| ProgressBar 分段模式（如 5 題測驗分 5 格）                                                                                      | TASK-011（如需要）                            | Gemini Phase 0 #3  |
| E2E 測試檔納入型別檢查（`tests/e2e/tsconfig.json` 未被根 tsconfig 引用）                                                        | 開始寫規格 4.2 主流程 E2E 前                  | TASK-001 審查 S2   |

## 待 Human 確認（規格 1.2：教材正確性由 Human 驗收）

- 第一關故事對白與角色（`src/data/lessons/bio-01.json` 的 `story`，賽爾隊長、米可）由 Claude 依 spec.txt 5.1 撰寫，需確認用語與知識正確性。（TASK-005）
- 第一關教材（`bio-01.json` 的 `lessons`：單元 A 6 項、B 7 項、C 3 項，含定義、白話解釋、生活例子、考試重點、圖說）由 Claude 依 spec.txt 5.2／FR-03 撰寫，需確認正確性與是否符合學校課程範圍。（TASK-006）
- 細胞示意圖（`public/images/cells/*.svg`）為 Claude 繪製的簡化示意圖，需確認構造位置與比例不會誤導。（TASK-006）
- 課程資料依 MVP 規格 §2 拆檔（`src/data/lessons/<id>.json`），偏離 spec.txt §8.1 把 lessons 放在 course 物件內的寫法；兩份規格互相矛盾，請確認。（TASK-005 審查 I2）
- 「任務完成提示」解讀為開場故事後的任務指令卡；若原意是完成教學／遊戲後的提示，需調整。（TASK-005 審查 S8）

## 使用限制（設計上的取捨，已寫入 README）

- 狀態不可只靠顏色表示，必須同時有文字或圖示。
- `BaseTag` 放在 `bg` 或 `surface` 上；放在 `surface-2` 上時 explore tone 對比僅 4.50:1。
- `bio` 色只作裝飾或主題標記，不代表答對或答錯。

## 觀察中（目前不處理）

- 細胞互動圖：選取粒線體時，摺痕也被套上 4px 白色外框，粒線體大多變白；摺痕應排除在選取樣式外。（TASK-007 複審 S-a）
- 細胞互動圖：點在細胞膜線外側半邊時，植物細胞會選到細胞壁、動物細胞沒有反應；動物細胞的點擊區不需裁切外側，植物細胞的裁切範圍可往外擴約 1.5 單位。（TASK-007 複審 S-b）
- 選取細胞質的填色高亮只檢查 class，沒有 E2E 檢查實際 computed fill。（TASK-007 複審 S-c）
- 細胞互動圖的提示 live region 每次點擊都會朗讀；`lesson.spec.ts` 少了重點整理內容的斷言；`cell-explorer.spec.ts` 一處註解位置錯置。（TASK-007 複審 S-d）

- 細胞圖形狀在 `public/images/cells/*.svg`（教學圖）與 `CellExplorer.vue`（可點擊版）各有一份，目前已同步（含粒線體摺痕、液胞透明度）；修改其中一份時要同步另一份。（TASK-007）
- 細胞互動圖中，動物細胞的液胞沿用單元 B 的液胞說明（含「協助維持膨壓」），膨壓主要是植物細胞的概念；可考慮為動物細胞另寫說明。（TASK-007 審查 S4）
- 細胞互動圖的小構造在 320px 寬時點擊區約 8–11px（液胞、粒線體、葉綠體），以 44px 構造按鈕作為替代操作。（TASK-007 審查 S2）

- 單元 A（生命的特徵）6 個知識點只有 emoji 圖示，沒有圖片或示意圖（FR-03 要求「圖片或示意圖」）；待美術資源。（TASK-006）
- CI 模式的 Playwright `retries: 2` 會掩蓋不穩定的測試；新增 E2E 時請用 `--retries=0` 連跑數次確認。（TASK-006）

- 故事角色頭像暫用 emoji（🧑‍🔬、🤖），待正式角色圖。（TASK-005）

- 最近學習紀錄的 v-for key 為 `courseId-completedAt-score`，同關、同毫秒、同分數時仍會重複；TASK-013 若為紀錄加上 id 再改用 id。（TASK-003 複審 S-E）

- 「開始冒險」是按鈕加 `router.push`，沒有連結語意（無法中鍵開新分頁）。（TASK-003 審查 S6）
- 最近學習紀錄的日期只顯示月／日，跨年紀錄分不出年份。（TASK-003 審查 S8）
- `CellIllustration` 的 SVG 顏色寫死 hex，未使用設計 token。（TASK-003 審查 S5）

- 非文字對比偏低：進度條軌道 `surface-2` 對 `surface` 為 1.26:1、卡片邊框 `border` 對 `surface` 為 1.61:1。進度填色對軌道為 6.04:1，進度本身可辨識。（TASK-002 審查）
- `npm audit` 有 16 個 moderate，全部來自 devDependencies，不進入 production bundle；修正需降版（破壞性）。（TASK-001 審查 S7）
- 範本殘留：`tsconfig.node.json` 的 `cypress.config.*`、`eslint.config.ts` 與 `playwright.config.ts` 的範本註解。（TASK-001 審查 S8）
- `npm run format` 只處理 `src/`，不含 `tests/` 與根目錄設定檔。（TASK-001 審查 S6）
- 停用按鈕文字對比約 4.1:1（WCAG 對停用元件豁免）。（TASK-002 審查）

## 不採用（附理由）

- 標題與段落的全域預設 margin：與 Tailwind 的 margin 歸零及 `space-y-*` 版面間距衝突。（Gemini Phase 0 #6）
- `BaseButton` 的 `sm` 尺寸（36px）：低於 44px 觸控標準。若日後真有需要，需保留 44px 點擊範圍。（Gemini Phase 0 #7）
