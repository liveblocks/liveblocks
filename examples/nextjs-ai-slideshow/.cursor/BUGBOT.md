# Bugbot rules for examples/nextjs-ai-slideshow

This app has an agent contract: [AGENTS.md](../AGENTS.md) (rules and
verification), [FEATURE_MAP.md](../FEATURE_MAP.md) (which feature owns what) and
a FEATURE.md per feature. Read the FEATURE.md of every touched feature before
reviewing.

`npm run check` already enforces formatting, lint, layer boundaries, public
surfaces, test placement, docs sync, suppression reasons and the test count.
Don't comment on those. Spend findings on what the checks can't see: wrong
behaviour, missing tests or docs, shortcuts around the architecture, and
loosened gates.

Every finding must name a concrete failure (input → wrong result) and a fix.
Label bugs _confirmed_ or _suspected_; a suspected finding is never blocking
unless it's a security issue.

<!-- sync:review-hazards:start -->

### Hazards specific to this repo

- Yjs is the source of truth: slide HTML lives in one `Y.Text` per slide and the
  slide order in the `slides` array. Writes must go through the deck's helpers
  (`features/deck`) inside a transaction; writing React state first and syncing
  later loses concurrent edits.
- Undo is scoped: the visual editor's `UndoManager` must only track its own
  origin; a write with the wrong origin becomes undoable by the wrong user.
- Slide HTML is untrusted (users and the AI write it) and is rendered in
  sandboxed iframes. Anything that moves HTML out of the iframe (export,
  proposals, server handlers) must keep it inert.
- Server handlers in `features/*/api/` hold the secret key: every route must
  check the caller's room access before touching Liveblocks, and never echo the
  key or the full upstream error to the client.
- The assistant has two paths: real AI Gateway and the mock reply when
  `AI_GATEWAY_API_KEY` is unset. A change to proposal parsing must work for
  both, and the mock is what e2e exercises.
- Feeds and Comments don't exist on the local dev server; code that assumes a
  thread or feed response locally will pass e2e and fail in production.
- `next dev` rewrites `tsconfig.json` and the AGENTS.md footer; those hunks are
  noise, not changes to review.
- Edge cases that matter here: a deck with zero slides; deleting the selected
  slide or the slide an AI proposal targets; two users editing the same slide; a
  proposal applied twice; very large slide HTML; the preview iframe not yet
  loaded when export or apply runs; Google Fonts unreachable during PPTX export.

### Architecture and contract

- No new dependency between features where the shared piece belongs in `lib/`.
  No logic in `app/`.
- No new helper that duplicates one in the shared code tables of
  `FEATURE_MAP.md`.
- A new name for a feature that users will see (UI copy, a route, a command) is
  added to that feature's "Also called" in `FEATURE_MAP.md`.
- FEATURE.md edits describe behaviour. They don't add counts or constants copied
  from code; the only file list is the checker-verified `## Files`.
- Hotspot files (`features/visual-editor/visual-editor.tsx`,
  `features/slide-preview/slide-preview.tsx`, `features/ai-chat/chat.tsx`,
  `views/slideshow-app/slideshow-app.tsx`) are touched only when there's no
  local alternative; new pure logic added to them is a finding.
- No tests skipped (`.skip`, `.only`, `test.fixme`) or weakened, and
  `tests/baseline.json` isn't lowered, unless the PR says why. Conditional skips
  for cloud-only services listed in AGENTS.md are fine.
- New suppressions (`// eslint-disable-next-line <rule> -- <reason>`) have
  reasons that hold up.
- Changes to the gates (`scripts/check-structure.mjs` and
  `scripts/structure.config.json`, `eslint.config.mjs`, `.prettierrc`,
  `tsconfig.json`, `tests/baseline.json`,
  `.github/workflows/nextjs-ai-slideshow.yml`, the format hooks, CODEOWNERS,
  this skill, `.cursor/BUGBOT.md`) are called out and justified. A gate loosened
  to get to green is blocking.
- Imports outside the current feature use the `@/` alias; Testing Library and
  Playwright queries use roles, labels and text; strings shown to users read
  like product copy, not debug output.

### Ignore

Formatting, import order, naming the linter covers, anything `npm run check`
enforces, generated files, lockfiles, vendored code (`components/ui`,
`components/ai-elements`), snapshot churn, style preferences that aren't in the
contract, and refactors outside the diff (unless the diff makes something
worse).

<!-- sync:review-hazards:end -->

### Completeness

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
