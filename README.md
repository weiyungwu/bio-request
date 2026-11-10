# BIO QUEST 生物冒險

Vue 3 + TypeScript + Vite + Tailwind CSS v4 + Pinia + Vue Router。
Specs live one level up: `../BIO QUEST 生物冒險-MVP開發任務規格.md`.

## Setup

Requires Node `^22.18.0 || >=24.12.0`.

```sh
npm install
```

> Use npm 11 (`engines.npm >=11`). npm 10.9.x crashes when it has to resolve the
> dependency tree from scratch (no lockfile, or adding a package):
> `Cannot read properties of null (reading 'edgesOut')`, an arborist peer-resolution bug.
> With the committed `package-lock.json`, `npm ci` works on npm 10 too.
> Without a global npm 11: `npx npm@11 install`.

## Scripts

| Command              | Purpose                                         |
| -------------------- | ----------------------------------------------- |
| `npm run dev`        | Dev server                                      |
| `npm run build`      | Type-check + production build                   |
| `npm run type-check` | `vue-tsc --build`                               |
| `npm run lint`       | oxlint + ESLint (auto-fix)                      |
| `npm run test`       | Vitest unit tests (single run)                  |
| `npm run test:e2e`   | Playwright E2E (`npx playwright install` first) |

## Layout

- `src/` — app code (`views/`, `components/{common,layout,lesson,game,quiz,achievement}`, `stores/`, `composables/`, `data/`, `types/`, `utils/`)
- `tests/unit/` — Vitest
- `tests/e2e/` — Playwright

## Deploy (Cloudflare Pages)

**Live:** https://bio-request.weiyung-wu.workers.dev/ — deployed as a Cloudflare **Worker**
(static assets, set up in the dashboard), not a Pages project. Unknown paths already fall
back to `index.html` there (checked: `/review`, `/quiz/bio-01` return the app), and the
main-flow E2E passes against it. The Pages steps below remain a valid alternative.

A static site: no server, no environment variables, no secrets. Progress lives in each
student's browser (LocalStorage), so deploys never touch student data.

### Recommended: Git integration (deploys on every push)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**,
   pick this repo.
2. Build settings:

   | Setting                | Value           |
   | ---------------------- | --------------- |
   | Production branch      | `main`          |
   | Framework preset       | None            |
   | Build command          | `npm run build` |
   | Build output directory | `dist`          |
   | Root directory         | (leave empty)   |

3. **Save and Deploy.** The site is served at `https://<project>.pages.dev`. Pushes to `main`
   update production; other branches get preview URLs.

Node comes from `.node-version` (22.23.4, the build image's current default, pinned so a
future default cannot change it). The build image's npm 10 works with the committed
`package-lock.json` (see Setup). Checked by building a
fresh clone with `npm ci && npm run build` on Node 22.23 / npm 10.9.9.

### Alternative: Direct Upload (manual, from this computer)

```sh
npm run build
npx wrangler pages project create   # once; asks for a name and production branch
npx wrangler pages deploy dist
```

A Direct Upload project cannot be switched to Git integration later; create a new project
instead.

### Routing

The app uses history-mode URLs (`/quiz/bio-01`). `dist/` has no top-level `404.html`, so
Pages serves `index.html` for unknown paths and Vue Router takes over. Do not add a
`public/404.html`: it turns that fallback off and deep links would 404.

### After deploying

Open `/`, then a deep link such as `/review` directly, and play one quiz; reload and
check the record is still on the home page.

## Design System (TASK-002)

- Tokens live in `src/assets/main.css` (`@theme`) and become Tailwind utilities:
  colors `bg` `surface` `surface-2` `border` `text` `muted` `explore` (teal, quest/primary)
  `reward` (yellow, EXP/hints) `success` `danger` (borders/icons/fills) `danger-text` (text on
  danger tints) `bio` (lime, decorative topic accent, never a status) `on-accent`; radius `rounded-control`
  `rounded-card` `rounded-pill`; shadows `shadow-card` `shadow-glow-explore` `shadow-glow-reward`.
- Breakpoints: mobile < 640px, tablet `sm`/`md`, desktop `lg` (1024px). Use `page-container`
  for the page gutter (16px mobile, 24px tablet+).
- Components in `src/components/common/`: `BaseButton` (`variant` primary/secondary/reward/ghost,
  `size` md/lg, `block`, `disabled`), `BaseCard` (`as`, `highlight` none/explore/reward),
  `BaseTag` (`tone` neutral/explore/reward/success/danger/bio; place on `bg` or `surface`),
  `ProgressBar` (`value`, `max`, `label` required for screen readers, `tone`).
- Accessibility rule: never convey status by color alone. Answer feedback, lock/clear states, etc.
  must also carry text or an icon (e.g. `✓ 答對`, `✗ 答錯`, `🔒 未開放`).
- Style guide: `npm run dev`, then open `/design-system` (dev only, not in production builds).

Known issues and deferred review items: [`docs/known-issues.md`](docs/known-issues.md).
Handover notes (current status, workflow, next task): [`docs/handoff.md`](docs/handoff.md).

- Level / EXP / badge design: [`docs/progression.md`](docs/progression.md).
- Stage unlocking: a stage is playable only if its id is in `OPEN_COURSE_IDS`
  (`src/utils/stages.ts`, MVP: `bio-01`). Add an id there when that stage's lesson and quiz
  data ship. A global router guard redirects `/lesson/:courseId` for locked or unknown ids to
  `/map` (also on param-only changes); unknown URLs redirect to `/`.
- Stage states map to spec FR-01 (已完成／進行中／尚未解鎖) plus one extra: `completed` ✓ 已完成,
  `in-progress` ⏳ 進行中 (attempted, not cleared), `open` ▶ 可挑戰 (never attempted — calling it
  進行中 would be misleading), `locked` 🔒 未開放.
- Lesson data: `src/data/lessons/<courseId>.json` (`story`, and `lessons` with FR-03 knowledge points),
  loaded by `getLessonData()` in `src/data/lessons/index.ts`.
  This follows the MVP spec §2 file layout and deviates from spec.txt §8.1, which nests `lessons`
  inside the course object (the two specs conflict). `story` is an addition not in §8.1.
  `passingScore` is not stored per course: `PASS_SCORE = 80` and `QUIZ_SIZE = 5` in
  `src/utils/quiz.ts` apply to every stage (spec TASK-011, §5.4).
- Quiz (`/quiz/:courseId`, TASK-011): pure engine in `src/utils/quiz.ts` (draw, judge, score),
  attempt state in the Pinia `quiz` store (in memory). Each question: answer → 提交答案 (disabled
  with a reason until every slot is filled) → verdict, correct answer and explanation → next.
  Matching and ordering are answered with one native `<select>` per row and scored
  all-or-nothing. Bank data errors are listed at the top of the quiz page.
- Result (`/result/:courseId`, TASK-012): after the last question the quiz store calls
  `progress.recordQuizResult()` exactly once (best/latest score, cleared status, activity record,
  EXP per `src/utils/exp.ts`: quiz-score band + first-clear bonus once per stage), then the page
  shows score, counts, verdict, EXP, every wrong question with both answers and the explanation
  (錯題補強), and 再挑戰. The attempt is in memory: after a reload the page shows an empty state.
  正確率 (spec page 6) is the score itself (correct / total × 100), so it is not shown twice.
  The quiz opens the result with `router.replace`, so Back does not start a new paper.
- Saved progress (TASK-013): the progress store loads LocalStorage key `bio-quest:progress`
  (`{ version: 1, exp, records, courseProgress, wrongQuestions, badges }`, `src/types/progress.ts`)
  when created and saves on every change. `parseProgress()` (`src/utils/progressStorage.ts`) starts
  empty on broken JSON or another version and otherwise drops only invalid entries; storage
  errors never throw. §8.3 keeps exp/wrongQuestions/earnedBadges per course; here they are global,
  and wrong questions are keyed by question id. 重設學習資料 is on the home page, behind an inline
  confirmation. Unit tests clear LocalStorage before each test (`tests/unit/setup.ts`).
- 錯題本 (`/review`, TASK-014): wrong questions from `progress.wrongQuestions`, grouped by stage
  (map order), 待複習 before 已熟悉. Each: show answer and explanation, 重新作答 with the quiz's
  `QuizQuestion` (ids prefixed per question), 標記已熟悉 / 取消. A correct retry sets
  `lastCorrectAt`; 重新答對 shows only while it is newer than `lastWrongAt`. A wrong retry clears
  已熟悉. Order is fixed per visit. `progress.reviewable` / `toReviewCount` include only questions
  still in a bank (others are counted on the page as missing). Linked from the result page and home.
- Achievements (TASK-015, rules in `docs/progression.md` §2–§5): `progress.claim(key, exp)` pays a
  first-time reward once (units via LessonCard `unit-complete`, games via `complete`, 錯題補強 when a
  stage's wrong questions are all re-answered right); quiz EXP is capped at 100 per local day using
  `records[].exp`; badges (`src/utils/achievements.ts`) are derived from progress and added once.
  Home lists all badges (已取得／未取得); the result page shows new ones and the cap.
- Question bank: `src/data/questions/<courseId>.json`, an array of spec.txt §8.2 questions, loaded
  and validated by `getQuestionBank()` in `src/data/questions/index.ts`. Types and answer formats
  (`src/types/question.ts`): `single_choice` (answer = option index), `true_false` (options fixed
  `["對","錯"]`, answer 0/1), `matching` (options `{left, right}`, answer[i] = right index for
  left[i]), `ordering` (answer = option indices in correct order). Matching is one-to-one (equal columns,
  no extra distractors). Invalid questions are dropped
  and listed in `errors` with a Chinese message naming the question and field. Ids are
  `<courseId>-qNN`, unique across courses (the wrong-answer book keys on them).
  Each question has `knowledgeIds` (v1.1): one or more knowledge point ids from the same
  course's lesson data (e.g. `b-nucleus`); unknown ids reject the question. The mapping is
  Human-confirmed content (`docs/audit/v1.1-learning-foundation-audit.md` §4.2) and only
  lives in the question data, so saved progress is unaffected.
- Learning events (v1.1): every quiz start, answer and finish, and every 錯題本 retry, is
  appended to LocalStorage `bio-quest:events` (`src/utils/learningEvents.ts` →
  `learningEventStorage.ts`), separate from `bio-quest:progress`. Quiz events share
  `activityId` `quiz:<courseId>:<attempt id>`; retries use `review`; `source` is `2d`.
  `bio-quest:player` holds an anonymous random id per browser (no personal data).
  重設學習資料 also clears the events (the player id stays). Saving an event never
  interrupts the game; a newer stored version, or entries this version can't read, are
  never overwritten.
- 「任務完成提示」(TASK-005) is read as the mission briefing card shown after the opening story
  (title + objectives + 接受任務). Pending Human confirmation (see `docs/known-issues.md`).
- E2E: `CI=1 npm run test:e2e` builds first, then tests the production preview (a stale
  `dist/` would otherwise test old code). Run new E2E with `--retries=0` a few times to catch flakiness.
