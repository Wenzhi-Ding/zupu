# Agent Instructions

## Tech Stack

- **Language:** TypeScript 5.9 (strict mode)
- **Framework:** React 19 + Zustand 5
- **Build:** Vite 7
- **Package Manager:** npm

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:ui` | Open Vitest UI dashboard |

## Testing Principles

### Philosophy

Tests are **not** a gate before building. Tests are written **after** code changes to lock in correctness and prevent regressions. Do not run tests before compiling — write code first, then write tests, then run tests to verify.

### When to Write Tests

1. **After implementing a feature or bug fix** — write tests that cover the new behavior.
2. **After refactoring** — ensure existing tests still pass; add tests if coverage drops.
3. **For pure logic modules** (store, layout engine, utils, i18n, data validation) — these should have the highest test coverage since they have no UI dependencies.
4. **For React components** — write tests for user-facing behavior (click handlers, form submissions, conditional rendering), not implementation details.

### What to Test

| Priority | Module | Test Type |
|----------|--------|-----------|
| 🔴 High | `store/familyStore.ts` | Unit tests for state mutations (add/remove/update person, relations, BFS pathfinding) |
| 🔴 High | `store/localDb.ts` | Unit tests for data validation, import/export, localStorage round-trips |
| 🔴 High | `layout/engine.ts` | Unit tests for tree layout algorithm, unit grouping, sibling ordering |
| 🔴 High | `utils/relationshipChain.ts` | Unit tests for kinship label composition, BFS path building |
| 🟡 Medium | `i18n/` | Unit tests for locale detection, key lookup, parameter substitution |
| 🟢 Lower | React components | Integration tests via React Testing Library (user interactions, not snapshots) |

### How to Write Tests

- **Test file location:** `src/**/*.{test,spec}.{ts,tsx}` — colocated with source files.
- **Framework:** Vitest with jsdom environment and `@testing-library/react` for components.
- **Globals enabled:** Use `describe`, `it`, `expect`, `vi` directly — no imports needed.
- **Setup file:** `src/test/setup.ts` (loads `@testing-library/jest-dom/vitest` matchers).
- **Mock external deps:** Use `vi.mock()` for `uuid`, `localStorage`, and i18n where determinism matters.

### Test Structure Pattern

```ts
describe('moduleName', () => {
  beforeEach(() => {
    // Reset state, clear mocks
  });

  it('should do X when Y', () => {
    // Arrange
    const input = ...;
    // Act
    const result = someFunction(input);
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Running Tests After Edits

After modifying any source file under `src/`, the agent should:

1. **Run `npm test`** to execute the full test suite.
2. If tests fail, read the error output and fix the issue — do not skip failing tests.
3. For significant changes, run `npm run test:coverage` and check that coverage thresholds are met.
4. The coverage thresholds are configured in `vite.config.ts` (lines/functions/branches/statements).

### Coverage Thresholds

The project enforces minimum coverage thresholds (configured in `vite.config.ts`):

- **Lines:** 50%
- **Functions:** 50%
- **Branches:** 35%
- **Statements:** 45%

These are starting thresholds. As the test suite matures, they should be raised.

### Coverage Report

After running `npm run test:coverage`:
- **Terminal:** Shows a summary table per file.
- **HTML:** Open `coverage/index.html` in a browser for a detailed line-by-line view.
- **JSON:** `coverage/coverage-summary.json` for programmatic access.

### Anti-Patterns to Avoid

- ❌ Don't test implementation details (private functions, component state).
- ❌ Don't use snapshot tests for UI components — they break on any change.
- ❌ Don't mock what you don't own — mock `uuid` and `localStorage`, not internal functions.
- ❌ Don't write tests that are tightly coupled to the DOM structure.
- ❌ Don't skip failing tests with `it.skip` without a documented reason.

## Code Style

- Use TypeScript strict mode — no `any` types.
- Follow existing patterns in the codebase.
- State management via Zustand store (`src/store/familyStore.ts`).
- i18n via `src/i18n/` with `t()` function and `useT()` hook.
