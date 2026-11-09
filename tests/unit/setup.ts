import { beforeEach } from 'vitest'

// The progress store loads LocalStorage when created (TASK-013); jsdom keeps it between
// tests in a file, so each test starts as a first-time student unless it seeds data.
beforeEach(() => localStorage.clear())
