# AGENTS.md

A multiplayer AI slideshow builder (Next.js app router, Liveblocks Yjs, Feeds
and Comments). Features live in `features/`, shared code in `lib/`, generic UI
in `components/`. A change is done when `npm run check` is green (see
Verification). Start with [FEATURE_MAP.md](FEATURE_MAP.md) to find the feature
that owns what you're changing, then read that feature's FEATURE.md.

## Layout

```
app/          entry: layout, providers, the page shell, and app/api/**/route.ts one-line re-exports
views/        composition: the slideshow screen that combines the features
features/     one folder per feature
components/   building blocks: shadcn ui + AI Elements copies, help button
lib/          core: shared helpers with no feature knowledge
tests/        shared test setup and Playwright helpers only (no tests)
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

- No cycles between features; when one appears, move the shared piece to `lib/`.
- Promote to `components/` only on second use.
- Server-only code lives in `features/<name>/api/` and is never re-exported from
  `index.ts`. Route files deep-import it: that's the one allowed deep import.

Enforced by `npm run lint:structure`. `npm run graph -- <feature> [--reverse]`
shows dependencies (or dependents); `npm run owner -- <file>` names the owner.

## Feature anatomy

```
features/<name>/
  index.ts        public surface: named exports only, never from ./api
  FEATURE.md      what a user can do, by sub-feature, ending with ## Files
  <name>.tsx …    the feature's modules
  api/            server handlers (optional); app/api/<route>/route.ts re-exports them
  tests/          *.test.ts(x) for Vitest, *.spec.ts for Playwright
```

- Tests: `tests/<module>.test.ts(x)` per module; `tests/<flow>.spec.ts` for e2e.
  `lib/` and `components/` modules need a matching test too (vendored
  `components/ui` and `components/ai-elements` are exempt).
- Check FEATURE_MAP.md's shared code tables before writing a helper; `lib/` may
  already have it.

## Conventions

- Comments in source files under `app/`, `views/`, `features/`, `lib/`: none.
  Explanations go in FEATURE.md or a test name. `components/**` (vendored) and
  `liveblocks.config.ts` (gallery convention) are exempt. — `lint:structure`
- Suppressions: single line, with an inline reason
  (`// eslint-disable-next-line rule -- reason`). — `lint:structure`
- Formatting: runs automatically after every edit (Claude Code and Cursor hooks
  call `scripts/format-changed.mjs`); otherwise run `npm run fix`. Never format
  by hand. — `format:check`
- `app/` holds only layout, page, providers, globals.css and route files; route
  files only re-export from `features/*/api/`. — `lint:structure`
- Tests query by role, label or text, never `data-testid`; no `.only`; `.skip`
  only as a conditional skip naming a cloud-only service. — `lint:structure`
- `console.log` never ships in production code. — `lint:structure`
- Imports use the `@/` alias for anything outside the current feature.
- Nested rules: [tests/AGENTS.md](tests/AGENTS.md) covers e2e specs and the
  shared Playwright helpers.

## Verification

A change is not done until `npm run check` is green, `npm run e2e` is green if
any user flow changed, and every item in the completeness checklist is ticked.

| Command                           | Proves                                                                                                                                                                                                                       | When                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `npm run check`                   | `format:check`, `lint:structure` (layers, surfaces, cycles, anatomy, test placement, docs, suppressions, sync), `typecheck`, `lint` (zero warnings), `test:baseline` (tests pass, none lost) — in that order, cheapest first | before declaring done                  |
| `npm run check:feature -- <name>` | the same for one feature folder (or any path), in seconds                                                                                                                                                                    | while iterating                        |
| `npm run fix`                     | formats and autofixes                                                                                                                                                                                                        | when a hook didn't run                 |
| `npm run e2e`                     | real user flows against a keyless local Liveblocks dev server                                                                                                                                                                | after touching any user flow           |
| `npm run check:all`               | `check` + `e2e`                                                                                                                                                                                                              | multi-feature changes                  |
| `npm run build`                   | the production build succeeds                                                                                                                                                                                                | after changing routing, config or deps |

Each step also runs alone (`npm run lint:structure`, `npm run typecheck`, …).
While iterating: `npm run check:feature -- deck`,
`npx vitest run features/deck`, `npx playwright test features/deck`.

Completeness checklist (correct is not the same as complete; `check` can't see
these):

<!-- sync:completeness:start -->

- [ ] New behaviour has a test at the right level (helper → unit test; component
      → component test; user flow → e2e), written before the code, and the test
      would fail if the behaviour broke. A new branch with no test isn't
      complete.
- [ ] The owning FEATURE.md describes the new or changed behaviour. If the
      feature's scope changed, its first line (and so its FEATURE_MAP.md row)
      still says what a user can do, and any new name users call it is in "Also
      called".
- [ ] New public pieces are exported from the public surface; internals are not.
- [ ] If a route, script or rule changed, AGENTS.md says so.
- [ ] No test was deleted, skipped or weakened without a reason in the PR.
- [ ] Every new suppression's reason holds up.

<!-- sync:completeness:end -->

When something fails:

- Structure check: the message names the file, line, rule and fix. Fix the
  structure; never widen the rule.
- Baseline: fewer tests means a test was deleted or discovery broke. Restore it,
  or lower `tests/baseline.json` by hand _and say so in the PR_. "Stale" in CI
  means the count rose: run `npm run test:baseline` locally and commit. On a
  merge conflict in the baseline, take the larger numbers and rerun.
- E2E: read the trace in `test-results/` before changing code, then rerun the
  single spec. Lint: fix the code; a suppression with a reason is a last resort.
- A gate seems wrong: say so in the PR. Don't edit checker rules, lint config,
  the baseline or CI to get to green.

Cannot be verified locally: the local Liveblocks dev server has no Feeds and no
Comments, so the AI chat reply (`features/ai-chat/tests/ai-chat.spec.ts`) and
comment pins (`features/slide-preview/tests/comments.spec.ts`) skip locally. Run
them with `LIVEBLOCKS_CLOUD=1 npm run e2e` (uses the real keys in `.env.local`),
or report them as unverified rather than building workarounds.

## Running locally

`npm run dev:local` starts a throwaway Liveblocks dev server (random port, no
persistence) and `next dev` on a free port (or `PORT`), injecting the local keys
and base URLs; nothing to configure. `--mock-ai` forces the mock assistant.
`npm run e2e` starts its own copy with `NEXT_DIST_DIR=.next-e2e`, so it can run
beside `dev:local` and in a second worktree.

`npm run dev` uses `.env.local` and real Liveblocks and AI Gateway keys. Run
`npm run env:check` to see which variables are set and what each one unlocks.

## Adding or changing a feature

1. Find the owning feature in FEATURE_MAP.md and read its FEATURE.md. For a new
   feature, run
   `npm run new:feature -- <name> "<one sentence: what a user can do>"`, which
   also adds its FEATURE_MAP.md row.
2. Describe the behaviour change in FEATURE.md.
3. Write or adjust the test first, at the right level.
4. Implement inside the feature; export new public pieces from `index.ts`.
5. Iterate with `npm run check:feature -- <name>`.
6. If the feature's scope changed, update the first line of its FEATURE.md (the
   checker makes you update its FEATURE_MAP.md row to match), and add any new
   name users call it to "Also called".
7. Run `npm run check`, plus `npm run e2e` if a user flow changed.
8. Self-review the diff with the `nextjs-ai-slideshow-review` skill
   (`.claude/skills/nextjs-ai-slideshow-review/SKILL.md`), and fix what it
   finds.

Worked example: none yet; the first feature-sized change after this restructure
should be written up as `docs/EXAMPLE_CHANGE.md`.

## Scripts

- `npm run graph [-- <feature> [--reverse]]` — feature dependency edges — when
  changing a public surface.
- `npm run owner -- <path>…` — owning feature and FEATURE.md for a file — before
  editing a file you didn't write.
- `npm run env:check` — which env vars are set and what each unlocks — when a
  flow needs real keys.
- `npm run test:coverage [-- <path>]` — Vitest coverage for one folder — after
  adding tests, to read the unexecuted lines. Never a gate.

## Tooling notes

- Next 16 locks its build directory per dev server; `next.config.ts` reads
  `NEXT_DIST_DIR` so e2e and `dev:local` can run at once.
- `next dev` rewrites `tsconfig.json`'s `include` and re-adds the block below;
  commit those edits with your work rather than fighting them.
- `components/ai-elements` is vendored from the AI Elements registry; lint rules
  are relaxed for it in `eslint.config.mjs` and it's exempt from the comments
  and test rules. Re-sync it, don't edit it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` (resolved from this file's directory; in
monorepos the `next` package may not be visible from the repo root) before
writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at
`node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a
diff only re-creates the uncommitted change; committing it with your work keeps
the tree clean.

<!-- END:nextjs-agent-rules -->
