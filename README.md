# BIO QUEST 生物冒險

Vue 3 + TypeScript + Vite + Tailwind CSS v4 + Pinia + Vue Router。
Specs live one level up: `../BIO QUEST 生物冒險-MVP開發任務規格.md`.

## Setup

Requires Node `^22.18.0 || >=24.12.0`.

```sh
npm install
```

> npm 10.9.x crashes during install (`Cannot read properties of null (reading 'edgesOut')`,
> an arborist peer-resolution bug). Use npm 11: `npx npm@11 install`.

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
