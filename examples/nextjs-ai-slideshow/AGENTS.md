# AGENTS.md

A multiplayer AI slideshow builder (Next.js app router, Liveblocks Yjs, Feeds
and Comments). Features live in `features/`, shared code in `lib/`, generic UI
in `components/`. A change is done when `npm run check` is green (see
Verification).

Start with [FEATURE_MAP.md](FEATURE_MAP.md) to find the feature that owns what
you're changing, then read that feature's FEATURE.md.

## Layout

```
app/          entry: layout, providers, the page shell, and app/api/**/route.ts one-line re-exports
views/        composition: the slideshow screen that combines the features
features/     one folder per feature (deck, slide-preview, visual-editor, code-editor, ai-chat, pptx-export, users)
components/   building blocks: shadcn ui + AI Elements copies, help button
lib/          core: shared helpers with no feature knowledge
tests/        shared test setup and Playwright helpers only
scripts/      the checks and scripts documented below
```

## Dependency rules

| Layer         | May import                                                      |
| ------------- | --------------------------------------------------------------- |
| `app/`        | `views/`, `features/*` (index or `api/`), `components/`, `lib/` |
| `views/`      | `features/*` (index), `components/`, `lib/`                     |
| `features/*`  | other features' `index.ts`, `components/`, `lib/`               |
| `components/` | `components/`, `lib/`                                           |
| `lib/`        | `lib/`                                                          |

- Other features only through their public surface (`features/<name>/index.ts`).
- No cycles between features; when one appears, move the shared piece to `lib/`.
- Promote to `components/` only on second use.
- Server-only code lives in `features/<name>/api/` and is never re-exported from
  `index.ts`. Route files deep-import it: that's the one allowed deep import.

## Feature anatomy

```
features/<name>/
  index.ts        public surface: named exports only, never from ./api
  FEATURE.md      what a user can do, by sub-feature, ending with ## Files
  <name>.tsx …    the feature's modules
  api/            server handlers (optional)
  tests/          *.test.ts(x) for Vitest, *.spec.ts for Playwright
```

- Tests: `tests/<module>.test.ts(x)` beside the code for unit and component
  tests; `tests/<flow>.spec.ts` for e2e. One test file per module.
- FEATURE.md: observable behaviour by sub-feature, ending with `## Files`.
- Check FEATURE_MAP.md's shared code tables before writing a helper; `lib/` may
  already have it.

## Conventions

- Comments in source files under `app/`, `views/`, `features/`, `lib/`: none.
  Explanations go in FEATURE.md or a test name. `components/**` (shadcn copies)
  and `liveblocks.config.ts` (gallery convention) are exempt.
- Suppressions: single line, with an inline reason
  (`// eslint-disable-next-line rule -- reason`).
- Formatting: runs automatically after every edit (Claude Code and Cursor hooks
  call `scripts/format-changed.mjs`); otherwise run `npm run fix`. Never format
  by hand.
- Imports use the `@/` alias for anything outside the current feature.
