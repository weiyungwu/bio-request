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
  `reward` (yellow, EXP/hints) `success` `danger` `on-accent`; radius `rounded-control`
  `rounded-card` `rounded-pill`; shadows `shadow-card` `shadow-glow-explore` `shadow-glow-reward`.
- Breakpoints: mobile < 640px, tablet `sm`/`md`, desktop `lg` (1024px). Use `page-container`
  for the page gutter (16px mobile, 24px tablet+).
- Components in `src/components/common/`: `BaseButton` (`variant` primary/secondary/reward/ghost,
  `size` md/lg, `block`, `disabled`), `BaseCard` (`as`, `highlight` none/explore/reward),
  `BaseTag` (`tone` neutral/explore/reward/success/danger; place on `bg` or `surface`),
  `ProgressBar` (`value`, `max`, `label` required for screen readers, `tone`).
- Style guide: `npm run dev`, then open `/design-system` (dev only, not in production builds).
