# 已知問題與後續開發清單

規格第 8 節交付物之一。每項註明來源與預計處理的任務；處理完畢後從清單移除，並在 commit 訊息註明。

## 延後到對應任務（審查已確認有效，等第一個使用者出現再做，避免先寫用不到的程式碼）

| 項目                                                                                                                            | 處理時機                     | 來源               |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------ |
| 可點擊卡片：hover / active / focus 狀態                                                                                         | TASK-004（關卡地圖）         | Gemini Phase 0 #5  |
| 教學重點提示樣式（左側色條 callout）                                                                                            | TASK-006 `ImportantNote.vue` | Gemini Phase 0 #5  |
| 教材中的生物專有名詞不可斷開（名詞外包 `whitespace-nowrap` span；`word-break: keep-all` 實測無效）                              | TASK-006（教材 JSON / 元件） | Gemini Phase 0 #6  |
| 測驗 / 配對選項元件：選取、答對、答錯狀態，選項編號與 ✓ / ✗ 圖示                                                                | TASK-008、TASK-011           | Gemini Phase 0 #2  |
| 提交按鈕停用時顯示原因（如「請先選取答案」）                                                                                    | TASK-011                     | Gemini Phase 0 #10 |
| `tests/unit/app.spec.ts` 仍使用 router singleton，改為每個測試各自建立 router（Pinia 是否接上 `main.ts` 已由 E2E 首頁測試涵蓋） | 下次修改 app.spec 時         | TASK-001 審查 S3   |
| 等級規則為暫定：每 100 EXP 升一級、從 Lv 1 開始（`src/utils/level.ts`），規格未定義                                             | TASK-015                     | TASK-003 實作      |
| ProgressBar 分段模式（如 5 題測驗分 5 格）                                                                                      | TASK-011（如需要）           | Gemini Phase 0 #3  |
| E2E 測試檔納入型別檢查（`tests/e2e/tsconfig.json` 未被根 tsconfig 引用）                                                        | 開始寫規格 4.2 主流程 E2E 前 | TASK-001 審查 S2   |

## 使用限制（設計上的取捨，已寫入 README）

- 狀態不可只靠顏色表示，必須同時有文字或圖示。
- `BaseTag` 放在 `bg` 或 `surface` 上；放在 `surface-2` 上時 explore tone 對比僅 4.50:1。
- `bio` 色只作裝飾或主題標記，不代表答對或答錯。

## 觀察中（目前不處理）

- 非文字對比偏低：進度條軌道 `surface-2` 對 `surface` 為 1.26:1、卡片邊框 `border` 對 `surface` 為 1.61:1。進度填色對軌道為 6.04:1，進度本身可辨識。（TASK-002 審查）
- `npm audit` 有 16 個 moderate，全部來自 devDependencies，不進入 production bundle；修正需降版（破壞性）。（TASK-001 審查 S7）
- 範本殘留：`tsconfig.node.json` 的 `cypress.config.*`、`eslint.config.ts` 與 `playwright.config.ts` 的範本註解。（TASK-001 審查 S8）
- `npm run format` 只處理 `src/`，不含 `tests/` 與根目錄設定檔。（TASK-001 審查 S6）
- 停用按鈕文字對比約 4.1:1（WCAG 對停用元件豁免）。（TASK-002 審查）

## 不採用（附理由）

- 標題與段落的全域預設 margin：與 Tailwind 的 margin 歸零及 `space-y-*` 版面間距衝突。（Gemini Phase 0 #6）
- `BaseButton` 的 `sm` 尺寸（36px）：低於 44px 觸控標準。若日後真有需要，需保留 44px 點擊範圍。（Gemini Phase 0 #7）
