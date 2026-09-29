# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Static, bilingual (es/en) Next.js 16 app that generates printable classroom worksheets (word search, crossword, arithmetic) entirely in the browser. The binding design is [docs/superpowers/specs/2026-09-12-generador-fichas-design.md](docs/superpowers/specs/2026-09-12-generador-fichas-design.md); per-phase plans live in `docs/superpowers/plans/`, phase reports in `docs/superpowers/reports/`. Product truth is in `PRODUCT.md`, the visual system in `DESIGN.md`, and the visual direction contract (with recorded deferrals) in `.impeccable/surfaces/`. Commits use Conventional Commits in Spanish.

## Commands

```bash
pnpm dev                 # next dev --webpack
pnpm build               # next build --webpack → out/, fails on any build warning, then sw.js + .br/.gz
pnpm build:e2e           # same with NEXT_PUBLIC_BASE_PATH=/fichas and inert ad placeholders (anchor on)
pnpm lint                # ESLint, must print 0 errors and 0 warnings
pnpm typecheck
pnpm test                # Vitest (src/**/*.test.ts(x) and scripts/**/*.test.mjs)
pnpm test src/core/text.test.ts          # a single unit test file
pnpm budget              # first-view weight per route, fails above 300 KB
pnpm test:e2e            # Playwright (Chromium) against out/ served at /fichas
pnpm test:e2e:root       # smoke project with empty basePath (builds out/ without basePath on port 4174)
pnpm metrics:fonts       # regenerate src/core/sheetFontMetrics.ts after changing @fontsource/andika
pnpm exec playwright test tests/e2e/print.spec.ts   # a single e2e spec
```

E2E runs against `out/` from `pnpm build:e2e`. If Playwright's `webServer` start hangs, build first, start `NEXT_PUBLIC_BASE_PATH=/fichas PORT=4173 node scripts/serve-out.mjs` yourself and run Playwright (it reuses the server outside CI). `pnpm build` rewrites `out/` without basePath, so rebuild with `build:e2e` before e2e.

## Architecture

- **Webpack only.** Turbopack copies `new Worker(new URL(...))` sources uncompiled; keep `--webpack` in dev and build.
- **Static export with two root layouts:** `src/app/(root)` is the language-detection redirect for `/`; `src/app/[lang]` is the app. A single dynamic segment `[lang]/[section]` resolves translated slugs through `src/i18n/routes.ts` (`generateStaticParams` returns only the slugs of each language).
- **One geometric source of truth for the sheet:** generators produce data → `src/layout/*` builds a `SheetDocument` of mm primitives (`src/core/sheet.ts`, text `y` is the baseline) → `src/render/svg/SheetSvg` renders it for preview and print, and `src/render/pdf` (pdf-lib) for the PDF. Sheets are grayscale (`TONE_HEX`).
- **Text is measured, not guessed:** `src/core/measure.ts` sums glyph advances from `src/core/sheetFontMetrics.ts` (generated from Andika latin WOFF; a drift test fails if the package changes). Andika has no kerning and SVG disables kerning/ligatures, so layout, SVG and PDF agree. Header text is fitted by width (`fitHeader`) and characters without a glyph are stripped from the sheet.
- **Two generators, one shape.** Each has `generators/X` (pure: validation, seeded generation, suggestions), a Worker (`src/workers/X.worker.ts`), `layout/X` (data → `SheetDocument`) and `tools/X` (the UI). `tools/shared/generationClient.ts` is the generic external store (read with `useSyncExternalStore`) that owns a Worker, ignores stale `requestId`s and fails after 1.5 s; each tool wraps it with its own types. Seeds are `v{algorithm version}-{body}` codes and each generator owns its version; the same canonical code plus the same parameters always produces the same sheet, frozen by a golden fixture per generator. `[lang]/[section]` resolves both tools.
  - **Word search:** seeded backtracking placement; `layout/wordsearch` builds the grid, the paginated word list and the solution page with capsules.
  - **Arithmetic booklet:** the combination space is enumerated when it fits in `ENUMERATE_MAX` and sampled with a constant attempt budget otherwise (so a smaller ask never finds less — `reduce-count` depends on it); division is built from divisor, quotient and remainder, never by rejection. `layout/arithmetic` lays out school column format, the Spanish casita and the English long-division bracket, the inline row, pagination and the answer key. Rows align on the first operand's baseline and the exercise index anchors to the row's top edge.
- **The sheet frame is shared:** `layout/common/frame.ts` draws the header, the footer, the margin data line (`página n/N · papel · código`) and the page-role tag for **every** generator — change it and both sheets change. `layout/common/primitiveBounds.ts` gives ink bounds (descenders, stroke widths) for containment tests.
- **PDF:** `render/pdf` may only be loaded with `import()` (ESLint rule; `pnpm budget` fails if `FontFile2`/`CIDFontType2` appear in initial chunks). Fonts are embedded as **WOFF with `subset: true`** (WOFF2 subsetting crashes @pdf-lib/fontkit) and referenced with `new URL('@fontsource/…woff', import.meta.url)`, so webpack hashes them and the service worker precaches them.
- **Module boundaries are enforced by ESLint** (`eslint.config.mjs`): `core` depends on nothing; `generators/X` and `layout/X` only on `core` and their own generator; `render/*` never knows generators or layout; `tools/X` never imports other tools, `ads`, `components` or `content`; `content` only uses `tools/X/index`. Parent-relative imports (`../`) are forbidden — use `@/`.
- **Paths:** never hardcode absolute paths. Navigation goes through `next/link`; every other asset URL through `withBasePath()` (`src/core/paths.ts`). `NEXT_PUBLIC_*` values are inlined at build time, so changing them requires a rebuild; read them with literal `process.env.NEXT_PUBLIC_X` access (see `src/ads/env.ts`).
- **Printing:** `tools/shared/PrintRoot` portals the sheet into `#print-root` as a direct child of `body`, sets `html[data-print-sheet]` and writes `<style id="print-page-size">`; the print CSS in `src/app/globals.css` hides every other body child. Pages without a mounted sheet print normally minus `.no-print` and ads.
- **Ads:** `AdSlot` (`src/ads`) is rendered only by `components/shell/ToolPageLayout` — sidebar (desktop, outside `[data-tool-canvas]`), in-article (only when an article exists) and mobile anchor (off by default). With no valid `NEXT_PUBLIC_ADSENSE_CLIENT` nothing loads; placeholders appear only in development or with `NEXT_PUBLIC_ADS_PLACEHOLDER=true`. `tests/e2e/ads.spec.ts` enforces ≥150 px between every `[data-action]` control and every visible ad.
- **Offline:** `scripts/build-sw.mjs` generates `out/sw.js` from `scripts/sw-template.js` with a precache list of `out/` (URL-encoded with `encodeURI`); hashed `_next/static` is cache-first, everything else network-first with cache fallback; other origins are never intercepted.
- **Privacy:** nothing the user types may reach URLs, storage, caches, console or requests (`no-console` is an ESLint error; `tests/e2e/network.spec.ts` checks with a sentinel). The only storage key is `santic-lang`.
- **Hooks with hydration:** `react-hooks/set-state-in-effect` is active; derive client-only values with `useSyncExternalStore` (see `WordSearchTool`, `PrintRoot`, `AdSlot`).

## Agent tooling present

- **Impeccable** (frontend design skill): `.claude/skills/impeccable` (also for other agents in `.agents/`, `.agent/`, `.gemini/`), subagents `impeccable-*` in `.claude/agents/`. Read `.claude/skills/impeccable/reference/craft-floor.md` and `DESIGN.md` before UI edits.
- **Hooks** (`.claude/settings.local.json`): after every `Edit`/`Write` and on `Stop`, `.claude/skills/impeccable/scripts/impeccable hook` runs design checks on UI files.
- **CodeGraph** index in `.codegraph/`: use `codegraph_explore` (or `codegraph explore "<query>"`, `codegraph callers <symbol>`) before grep; don't edit `.codegraph/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
