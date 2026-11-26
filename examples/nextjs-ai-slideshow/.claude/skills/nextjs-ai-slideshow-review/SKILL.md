---
name: "nextjs-ai-slideshow-review"
description: >-
  Review a diff, branch, commit or pull request in the Liveblocks monorepo
  scoped to examples/nextjs-ai-slideshow against its agent contract. Confirms
  the checks are green, reads the contract and the owning FEATURE.md for every
  touched feature, then reports only what the checks cannot catch: real bugs,
  behaviour changed without docs or tests, weakened or deleted tests,
  architecture shortcuts, loosened gates and contract drift. Use whenever asked
  to review, check, look over or approve changes in this app, and for
  self-review before declaring work done.
---

# Reviewing changes in nextjs-ai-slideshow

All commands below run from `examples/nextjs-ai-slideshow`.

Your job is to find what `npm run check` can't: wrong behaviour, missing tests
or docs, and shortcuts around the architecture. Formatting, lint, layer rules,
docs sync, suppression reasons and test counts are already enforced, so don't
spend findings on them.

## 1. Get the change

- Pull request:
  `gh pr view <pr-number> --json title,body,baseRefName,files,comments` and
  `gh pr diff <pr-number>`
- Branch: `git fetch origin main`, then `git diff origin/main...HEAD -- .` and
  `git log --oneline origin/main..HEAD -- .`
- Working tree: `git diff HEAD -- .` and `git status --porcelain .` (to see new
  files)

Read the PR description: what does it claim to do? You'll check that claim. Map
the touched files to features with `npm run owner -- <paths>`.

If the PR already has review comments, don't repeat findings that were already
raised. Inline comments aren't in `gh pr view`; fetch them with
`gh api repos/{owner}/{repo}/pulls/<pr-number>/comments --paginate`.

**In CI**, run no code from the PR: no `npm run check`, no tests, no scripts.
Read only, and prove suspicions with exact reproduction steps instead of a
failing test.

## 2. Gate on the checks

- Locally: run `npm run check`, plus `npm run e2e` if a user flow changed.
- On a PR: `gh pr checks <pr-number>`; the `nextjs-ai-slideshow` workflow runs
  `check` and `e2e`. Ignore your own pending job.
- If the checks are red, report the failing command and its first errors under
  "Checks", then stop; re-review once they're green. If you were asked for early
  feedback anyway, carry on, and say the checks are red.
- If you can't run the checks, say so under "Not verified".

## 3. Load the contract

- `AGENTS.md`
- `FEATURE_MAP.md`, especially the shared code tables, to spot new helpers that
  duplicate existing ones
- The FEATURE.md of every touched feature, and of every feature whose public
  surface it changed (`npm run graph -- <feature> --reverse` lists them)
- Nested AGENTS.md files for the touched paths: `tests/AGENTS.md` for e2e specs
  and Playwright helpers
- Worked example: none yet (`docs/EXAMPLE_CHANGE.md` once the first
  feature-sized change lands)

## 4. Review

Read changed code in context: open the whole function and its callers, not just
the hunk.

### Correctness (most of the value is here)

- Trace one realistic input through each new or changed branch. Then try the
  edges: empty, missing, duplicate, very large, concurrent, retried, offline,
  unauthorised.
- Error paths: is every failure handled or deliberately propagated? Is anything
  swallowed?
- Does the change do what the PR says, and nothing else? Unrelated behaviour
  changes are findings.
- Security: authorisation on new endpoints and handlers, input validation at
  trust boundaries, secrets in code, logs or client bundles, injection.
- Data: schema and migration changes are compatible with the running code and
  reversible.

When you suspect a bug, try to prove it: locally with a failing test (don't
commit it), in CI with exact reproduction steps. Label each finding _confirmed_
or _suspected_.

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

Test levels for this repo: Vitest unit tests for pure modules and server
handlers (`*.test.ts`), Testing Library component tests under jsdom
(`*.test.tsx`), Playwright e2e against the keyless local dev server
(`*.spec.ts`), with Feeds and Comments flows cloud-only.

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

## 5. Report

**Blocking** means one of:

- a confirmed bug
- a security issue (confirmed or suspected)
- possible data loss
- a loosened gate
- new or changed behaviour with no test

Everything else is **Should fix** (at most three items; drop the weakest) or not
worth mentioning. A suspected finding is never Blocking unless it's a security
issue.

```
Verdict: approve | request changes | discuss
Checks: <what ran, result>   Read: <docs read>

Blocking
1. path/to/file:42 — <what's wrong>. <Concrete failure: input → wrong result>. Fix: <specific change>. (confirmed | suspected)

Should fix
1. …

Contract drift
- <doc or rule now out of step with the code, and the edit that fixes it>

Not verified
- <what you couldn't run or check, and the command that would>
```

- Every finding names the file and line, a concrete failure, and a fix. No
  praise, and no restating the diff.
- If you find nothing, write "Verdict: approve" and list what you checked. Don't
  invent findings to look thorough.
- When running in CI with a comment tool available, post each finding as an
  inline comment on its line, and the verdict as one summary comment.

## 6. Make this list shrink

If a finding is mechanical (a script could have caught it), note it under
"Contract drift" and propose the check that would catch it. Every recurring
finding should eventually move into `npm run check`.
