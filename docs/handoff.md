# 交接筆記

換電腦或開新 session 時先讀這份，再讀 [`known-issues.md`](known-issues.md) 和 `git log --oneline -15`。
最後更新：2026-11-09（TASK-009 完成後）。

## 目前進度

| Phase | 任務                                                              | 狀態                                       |
| ----- | ----------------------------------------------------------------- | ------------------------------------------ |
| 0–1   | 專案骨架、設計系統、首頁、關卡地圖（TASK-001～004）               | 完成，Phase 審查已處理                     |
| 2     | 故事對話、教學卡、細胞互動圖（TASK-005～007）                     | 完成，Phase 2 審查已處理（commit 9dc341e） |
| 3     | TASK-008 細胞器配對                                               | 完成，任務審查已處理（commit e0056e6）     |
| 3     | TASK-009 分類遊戲（植物／動物／兩者皆有）                         | 完成，任務審查已處理（commit 1188f8a）     |
| 4–5   | **測驗引擎、結果頁、LocalStorage、錯題本（TASK-010～）** ← 下一步 | 未開始                                     |

第一關流程（`src/views/LessonView.vue`）：故事 → 探險者訓練（16 個知識點＋重點整理）→ 細胞城市探險（細胞互動圖）→ 互動挑戰（配對遊戲 → 分類遊戲）。Phase 3 結束後需做 Phase 審查（不同模型或 Human）。

## 下一步要知道的

- `ClassificationGame.vue` 沒有 `emit('complete')`：等 TASK-011 測驗頁接上時再加（同 TASK-008 的做法，第一個使用者出現才寫）。
- 遊戲 UI 模式（點選、`aria-disabled` 保留焦點、✓／✗／▶ 不只靠顏色、`aria-live` 回饋每次重新渲染）建議測驗選項比照。

## 工作流程（規格 §1.2）

1. 實作一個任務 → 跑下方全部檢查 → commit。
2. 用**全新 context 的 code-reviewer agent** 審查該 commit（實作者不得自行審查）→ 修正 → commit（`fix(...): address TASK-xxx review`）。
3. 不處理的審查項目寫進 `known-issues.md`，註明來源與理由。
4. 每個 Phase 結束由不同模型（Gemini、Codex）或 Human 審查，報告存成上層資料夾的 `phase-N-review.md`。
5. 教材正確性由 Human 驗收；Claude 撰寫的內容列在 `known-issues.md`「待 Human 確認」。

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
- Phase 3 審查（不同模型或 Human），報告存成上層資料夾的 `phase-3-review.md`。
- 其餘見 `known-issues.md`「待 Human 確認」。

## 不在這個 repo 裡的檔案

規格書與 Phase 審查報告放在上層資料夾 `bio-request/`，沒有進 git：

- `BIO QUEST 生物冒險-MVP開發任務規格.md`（任務與驗收條件）
- `BIO QUEST 生物冒險-spec.txt`（產品與技術規格）
- `phase-0-review-gemini.md`、`phase-1-review.md`、`phase-2-review.md`

這個 repo 是公開的，所以這些檔案刻意不進 git，改用雲端硬碟（例如 iCloud、Google Drive）同步。在另一台電腦工作前，先把這些檔案同步下來，放在 repo 的上一層（與 `bio-quest/` 同一層），文件中的 `../BIO QUEST …` 路徑才找得到。

新的 Phase 審查報告也存到上層資料夾，並一起同步，不要 commit 進 repo。
