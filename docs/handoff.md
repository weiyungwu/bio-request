# 交接筆記

換電腦或開新 session 時先讀這份，再讀 [`known-issues.md`](known-issues.md) 和 `git log --oneline -15`。
最後更新：2026-11-10（規格 4.2 主流程 E2E 完成後）。

## 目前進度

| Phase | 任務                                                                            | 狀態                                       |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------ |
| 0–1   | 專案骨架、設計系統、首頁、關卡地圖（TASK-001～004）                             | 完成，Phase 審查已處理                     |
| 2     | 故事對話、教學卡、細胞互動圖（TASK-005～007）                                   | 完成，Phase 2 審查已處理（commit 9dc341e） |
| 3     | TASK-008 細胞器配對                                                             | 完成，任務審查已處理（commit e0056e6）     |
| 3     | TASK-009 分類遊戲（植物／動物／兩者皆有）                                       | 完成，任務審查已處理（commit 1188f8a）     |
| 3     | Phase 3 審查（Gemini）                                                          | 已處理（commit a06fa0b）                   |
| 4     | TASK-010 題庫資料結構與第一關 12 題                                             | 完成，任務審查已處理                       |
| 4     | TASK-011 測驗引擎（`/quiz/:courseId`）                                          | 完成，任務審查已處理                       |
| 4     | TASK-012 測驗結果頁（`/result/:courseId`）                                      | 完成，任務審查已處理                       |
| 5     | TASK-013 LocalStorage 進度管理                                                  | 完成，任務審查已處理                       |
| 5     | TASK-014 錯題本（`/review`）                                                    | 完成，任務審查已處理                       |
| 5     | TASK-015 成就系統（徽章、EXP 規則、每日上限）                                   | 完成，任務審查已處理                       |
| 4–5   | Phase 4–5 審查（Gemini，PASS；S-01 已修正）                                     | 已處理（commit eff3059）                   |
| —     | 需求變更：關卡地圖「直接測驗」（狀態標籤下方，直接進入 `/quiz/:courseId`）      | 完成，任務審查已處理（commit 7c1b9d0）     |
| M7    | 規格 4.2 主流程 E2E（`tests/e2e/main-flow.spec.ts`）；E2E 檔納入型別檢查        | 完成，任務審查已處理（commit 97f162b）     |
| M7    | README 部署說明（Cloudflare Pages）、`.node-version`                            | 完成                                       |
| M7    | **Cloudflare Pages 部署** ← 下一步（Human 在 dashboard 連接 GitHub，見 README） | 未開始                                     |

第一關流程（`src/views/LessonView.vue`）：故事 → 探險者訓練（16 個知識點＋重點整理）→ 細胞城市探險（細胞互動圖）→ 互動挑戰（配對遊戲 → 分類遊戲）→ 關卡測驗（`QuizView`，5 題）。Phase 3 審查（Gemini）已處理。

## 下一步要知道的

- 下一步：M7 部署。Human 依 README「Deploy」在 Cloudflare dashboard 連接 GitHub；部署後用網址驗證首頁、直接開 `/review`、玩一次測驗並重新整理。
- 主流程 E2E 全程點擊、不直接輸入網址；`playStory(page, { open: false })` 從目前頁面開始玩故事，呼叫前要先 `page.clock.install()`。
- 「直接測驗」讓學生不上課也能直接考：Human 已確認（學生可能已在課堂上或先前學過）。主流程 E2E 仍照規格 4.2 走完整課程，另有單元測試涵蓋直接測驗。
- 保存的資料格式若要加欄位，必須是選填或有預設值（見 known-issues）。多個分頁會透過 `storage` 事件同步。
- 讀 `useQuizStore()` 時要確認 `quiz.courseId` 是目前的關卡。
- 單元測試每個測試前會清空 LocalStorage（`tests/unit/setup.ts`）；重新建立 Pinia 等於重新整理頁面。
- 資料格式、測驗與結果頁流程見 README。

## 工作流程（規格 §1.2）

1. 實作一個任務 → 跑下方全部檢查 → commit。
2. 用**全新 context 的 code-reviewer agent** 審查該 commit（實作者不得自行審查）→ 修正 → commit（`fix(...): address TASK-xxx review`）。
3. 不處理的審查項目寫進 `known-issues.md`，註明來源與理由。
4. 每個 Phase 結束由不同模型（Gemini、Codex）或 Human 審查，報告存成上層資料夾的 `phase-N-review.md`。
5. 教材正確性由 Human 驗收；Claude 撰寫的內容列在 `known-issues.md`「待 Human 確認」。
6. 著作權檢查（每個 Phase 審查都要做；這個 repo 是公開的）：
   - 教材、題目、解析是原創文字，沒有照抄課本、教師講義、出版社題庫或會考試題。講義與課本只用來確認觀念，會考試題只能取其觀念重新出題。
   - 圖片、角色、背景、動畫、音效是自製的，或授權允許公開使用（例如 CC0）；不像現有卡通或遊戲角色。
   - 畫面上不使用出版社或考試單位的名稱與商標。
   - 參考過的資料（書名、單元、網址）與外部素材的出處、授權寫進 `known-issues.md`。

## 檢查指令

```sh
npm run type-check
npm run lint:check
npm run test                                        # vitest
npx prettier --check src tests docs
npm run build && CI=1 npx playwright test --retries=0  # 連跑兩次，確認沒有 flaky
```

- CI 模式的 Playwright 預設 `retries: 2` 會掩蓋不穩定測試，新增 E2E 時一律加 `--retries=0`。
- macOS 12 的電腦：目前的 Playwright 不支援下載瀏覽器（`Playwright does not support chromium on mac12`）。改用快取中的舊版 `~/Library/Caches/ms-playwright/chromium_headless_shell-1228/`：建立一個暫時的 config，匯入 `playwright.config.ts`，在每個 project 的 `use.launchOptions.executablePath` 指向它，跑完刪掉，不要 commit。
- Playwright 的 `click()` 會等待 `aria-disabled="true"` 的元素，測試點擊已完成項目時改用 `dispatchEvent('click')`。

## 等 Human 處理

- 確認配對遊戲文字（`bio-01.json` 的 `matching`：功能敘述與錯誤提示）。
- 其餘見 `known-issues.md`「待 Human 確認」。

## 不在這個 repo 裡的檔案

規格書與 Phase 審查報告放在上層資料夾 `bio-request/`，沒有進 git：

- `BIO QUEST 生物冒險-MVP開發任務規格.md`（任務與驗收條件）
- `BIO QUEST 生物冒險-spec.txt`（產品與技術規格）
- `phase-0-review-gemini.md`、`phase-1-review.md`、`phase-2-review.md`

這個 repo 是公開的，所以這些檔案刻意不進 git，改用雲端硬碟（例如 iCloud、Google Drive）同步。在另一台電腦工作前，先把這些檔案同步下來，放在 repo 的上一層（與 `bio-quest/` 同一層），文件中的 `../BIO QUEST …` 路徑才找得到。

新的 Phase 審查報告也存到上層資料夾，並一起同步，不要 commit 進 repo。
