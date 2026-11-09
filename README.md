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
  `passingScore` (§8.1) is decided in TASK-011 (spec rule: pass = score >= 80).
- 「任務完成提示」(TASK-005) is read as the mission briefing card shown after the opening story
  (title + objectives + 接受任務). Pending Human confirmation (see `docs/known-issues.md`).
- E2E: `CI=1 npm run test:e2e` builds first, then tests the production preview (a stale
  `dist/` would otherwise test old code). Run new E2E with `--retries=0` a few times to catch flakiness.
