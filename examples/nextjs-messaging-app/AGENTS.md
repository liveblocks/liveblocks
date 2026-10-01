# Agent guide: nextjs-messaging-app

This file is the contract for anyone (human or agent) changing this example.
Read it before touching code. `FEATURE_MAP.md` describes _what the app does_;
this file describes _how the code is organised_ and _how to prove a change is
correct_.

The example is standalone: it is not part of the monorepo workspace, uses `npm`,
and depends on the _published_ Liveblocks packages. Nothing here needs the
monorepo to be built.

## Directory layout

```
app/              Next.js routing only. No logic lives here.
  layout.tsx
  page.tsx        renders <AppShell /> from views/app-shell
  globals.css
  api/**/route.ts one line each: re-export a handler from features/*/api/
features/         One folder per product feature. Owns its UI, model, API
                  handlers and tests.
views/            The screen regions that compose features into the page.
primitives/       Small presentational building blocks reused by more than one
                  feature or view. Tests in primitives/tests/.
lib/              Shared domain model and helpers with no UI and no feature
                  dependencies. Tests in lib/tests/.
tests/            Shared test infrastructure only (setup, mocks, e2e helpers).
                  No test files live here.
scripts/          Repo tooling (structure check).
liveblocks.config.ts   Global Liveblocks type declarations (stays at the root).
```

Everything is imported through the `@/` alias (`@/features/channels`,
`@/primitives/avatar`, `@/lib/feeds`). Relative imports are only used _inside_ a
single feature, view or primitive.

## Layers and import rules

Layers, lowest to highest. A module may import from its own layer or any layer
below it, never above.

| Layer         | May import                                                       |
| ------------- | ---------------------------------------------------------------- |
| `lib/`        | npm packages, `liveblocks.config.ts` globals, other `lib/` files |
| `primitives/` | `lib/`, other primitives                                         |
| `features/`   | `lib/`, `primitives/`, other features via their `index.ts`       |
| `views/`      | everything above, other views                                    |
| `app/`        | `views/` and `features/*/api/*` only                             |

Additional rules:

- **Barrel-only access.** Code outside a feature imports it as
  `@/features/<name>` (its `index.ts`). Deep imports such as
  `@/features/channels/channel-list` are forbidden. The single exception is
  `app/api/**/route.ts`, which imports `@/features/<name>/api/<handler>`.
- **No server code in barrels.** `features/<name>/index.ts` must never import
  from `./api/`. API handlers use `@liveblocks/node` and must not reach the
  client bundle.
- **No cycles between features.** If feature A needs something from B and B
  needs something from A, the shared piece moves to `lib/`. Feed id builders,
  message types and navigation types live in `lib/` for exactly this reason.
- **Explicit barrels.** `index.ts` lists named exports. `export *` is not
  allowed; the public surface of a feature must be readable at a glance.
- `scripts/check-structure.mjs` enforces all of the above (see
  [Verification](#verification)).

## Anatomy of a feature

```
features/<name>/
  index.ts            public surface (components, hooks, pure helpers, types)
  <name>.ts           pure model code for the feature (ids, guards, helpers)
  <component>.tsx     one exported component per file, kebab-case file names
  api/<handler>.ts    Next.js route handlers (GET/POST), server-only
  tests/
    <module>.test.ts(x)   vitest: unit, component and API tests
    <name>.spec.ts        Playwright: end-to-end flows for this feature
```

- `tests/` is mandatory and must contain at least one test file.
- A test file is named after the module it covers (`channel-list.test.tsx`
  covers `channel-list.tsx`). E2E specs are named after the feature.
- `.test.` is vitest, `.spec.` is Playwright. Never mix.
- API tests start with the `// @vitest-environment node` pragma; everything else
  runs in jsdom.
- Views follow the same anatomy (`views/<name>/index.ts`, `tests/`) minus
  `api/`.
- Primitives and `lib/` modules are single files; their tests live in a shared
  `tests/` folder beside them, one test file per module:
  `primitives/unread-badge.tsx` → `primitives/tests/unread-badge.test.tsx`,
  `lib/feeds.ts` → `lib/tests/feeds.test.ts`. Every module there must have one.

One rule covers every layer: tests live in a `tests/` folder next to the code
they cover, never as sibling files.

## Feature inventory

| Feature                    | Owns                                                                                                                                                              | May import from features           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `features/users`           | User switcher (`user-menu.tsx`); `api/liveblocks-auth.ts`, `api/users.ts`, `api/users-search.ts`                                                                  | —                                  |
| `features/workspaces`      | Workspace list and themes (`workspaces.ts`), `workspace-switcher.tsx`                                                                                             | —                                  |
| `features/channels`        | `channels.ts` (`DEFAULT_CHANNELS`, `createInitialStorage`), `channel-list.tsx` (CRUD, reorder, badges), `channel-members.tsx`                                     | `activity`                         |
| `features/direct-messages` | `direct-message-list.tsx` (compact + detailed lists)                                                                                                              | `activity`                         |
| `features/messages`        | `message.tsx` (hover toolbar, reactions, reply pill), `message-list.tsx` (scrolling, intros), `message-items.ts` (grouping, dividers), `emoji-picker-popover.tsx` | —                                  |
| `features/composer`        | `composer.tsx`, `composer.css`, `mention-suggestions.tsx`, `serialize-markdown.ts`, `typing-indicator.tsx`                                                        | `activity`, `ai`                   |
| `features/threads`         | `thread-panel.tsx`                                                                                                                                                | `activity`, `composer`, `messages` |
| `features/activity`        | `activity.ts` (root feed, unread rule), `use-activity.ts` (hooks), `activity-panel.tsx`                                                                           | —                                  |
| `features/ai`              | `api/ai-reply.ts` (streaming reply handler), `request-ai-reply.ts` (client trigger used by the composer)                                                          | —                                  |
| `features/help`            | `help-button.tsx` (gallery help modal)                                                                                                                            | —                                  |

The last column is the current dependency graph between features. It is acyclic
and `lint:structure` keeps it that way. Adding an edge is fine; adding a cycle
is not — move the shared piece to `lib/` instead (that is why
`getThreadParticipantIds` lives in `lib/threads.ts`, not `features/threads`: the
AI route needs it and the composer needs the AI route).

### Views

| View                 | Exports                          | Owns                                                                                                   |
| -------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `views/app-shell`    | `AppShell`, `AppLoadingFallback` | providers, fake-login persistence, workspace/room selection, theming, selection fallbacks, page layout |
| `views/rail`         | `Rail`                           | workspace switcher, Home/DMs/Activity tabs with badges, user menu                                      |
| `views/sidebar`      | `Sidebar`                        | picks channel list, DM list or activity panel for the active tab                                       |
| `views/conversation` | `ConversationView`               | header (channel/DM), members, help, message list, composer, thread panel                               |

### Primitives

`avatar.tsx`, `unread-badge.tsx`, `column-header.tsx`, `preview-row.tsx`
(`PreviewRow`, `MessagePreview`, `UnreadDot`, `PreviewSkeleton`), `markdown.tsx`
(`Markdown`, `InlineMarkdown`).

A primitive is promoted from a feature only once a second feature or view needs
it. Until then it stays in the feature.

### Shared `lib/`

| File                                      | Contents                                                                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/database.ts`                         | Demo users, `AI_USER`, `getUser`, `getUsers`, `getRandomUser` (gallery convention; see `.claude/skills/create-example`)                                                                   |
| `lib/feeds.ts`                            | Feed id prefixes and builders (`getDmFeedId`, `isDmFeedId`, `getThreadFeedId`, `isThreadFeedId`, `getActivityFeedId`), `ChatMessage` / `ActivityItem` types and guards, `ThreadFeed` type |
| `lib/mentions.ts`                         | `<@userId>` tokens: `getMentionedUserIds`, `mentionToken`, `hasMention`                                                                                                                   |
| `lib/threads.ts`                          | `getThreadParticipantIds` (authors + mentioned users of a thread)                                                                                                                         |
| `lib/channels.ts`                         | `Channel` (the shape stored in Storage's `channels` list)                                                                                                                                 |
| `lib/navigation.ts`                       | `Selection`, `Conversation`, `MessageHighlight`, `SidebarTab`                                                                                                                             |
| `lib/time.ts`                             | `formatTime`, `formatDayLabel`                                                                                                                                                            |
| `lib/example.ts`, `lib/example.client.ts` | Gallery integration (`exampleId`, `examplePreview`)                                                                                                                                       |

Every `lib/` module has a test in `lib/tests/` (`lib/tests/feeds.test.ts`).

## Comments policy

The code contains **no comments**. Not in sources, tests, styles or config
files. The only permitted comment lines are tool directives:

- `// @vitest-environment node`
- `// @ts-expect-error …`, `// @ts-ignore …`
- `// eslint-disable…` variants
- `/* … */` license headers in third-party-derived files (none today)

Anything that would need a comment goes somewhere discoverable instead:

- behaviour a user can observe → `FEATURE_MAP.md`
- structure, tooling, non-obvious config (why `.next-e2e` exists, why the AI key
  is blanked in e2e) → this file, under [Tooling notes](#tooling-notes)
- a tricky invariant → a test whose name states the invariant

`scripts/check-structure.mjs` fails on any other comment. The detector is
line-based, not a parser: it ignores `//` inside string, template and regex
literals, but a regex literal containing `/*` will be flagged. Rewrite the regex
(e.g. `\/\*`) rather than adding an exception.

## Verification

Run these from `examples/nextjs-messaging-app/`. A change is not done until the
relevant set is green.

| Command                  | What it proves                                                               | When                                          |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------- |
| `npm run typecheck`      | `tsc --noEmit` passes                                                        | after every series of edits                   |
| `npm run lint:structure` | layers, barrel-only imports, no cycles, anatomy, test placement, no comments | after moving or adding files                  |
| `npm run format:check`   | every file is Prettier-formatted (`.prettierrc`)                             | before declaring any task done                |
| `npm test`               | all vitest suites (unit, component, API)                                     | after every series of edits                   |
| `npm run check`          | the four above, in order                                                     | before declaring any task done                |
| `npm run test:e2e`       | Playwright against a throwaway local Liveblocks dev server                   | after touching UI flows, before finishing     |
| `npm run check:all`      | `check` + `test:e2e`                                                         | restructures, multi-feature changes           |
| `npm run build`          | production `next build` succeeds                                             | after changing `app/`, config or dependencies |
| `npm run test:e2e:cloud` | e2e against the keys in `.env.local`; the only way to run the AI specs       | only when `features/ai` changed               |

Targeted runs while iterating:

```bash
npx vitest run features/channels                 # one feature's vitest suites
npx vitest run primitives                        # all primitive tests
npx liveblocks dev -P --no-check -c "playwright test features/channels"
```

### Expected test counts

Changes must not lose tests. Current baseline:

- vitest: 30 files, 161 tests
- Playwright: 7 spec files, 34 tests (2 in `features/ai/tests/ai.spec.ts` skip
  on the local dev server)

These numbers may only go up. If a test is deliberately deleted, say so in the
PR description and update this section.

### Environment

- `npx playwright install chromium` once.
- `npm run test:e2e` needs no keys: `liveblocks dev -P` starts a local server
  and injects `LIVEBLOCKS_SECRET_KEY` and `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL`.
- `npm run test:e2e:cloud` and real AI replies need `LIVEBLOCKS_SECRET_KEY` (and
  optionally `AI_GATEWAY_API_KEY`) in `.env.local`. See `.env.example`.
- The e2e suite starts `next dev` on port 3111 with `NEXT_DIST_DIR=.next-e2e` so
  it can run next to a dev server you already have on 3000.

## Adding or changing a feature

1. Read the relevant section of `FEATURE_MAP.md` and the feature's `index.ts`.
2. Put new code in the owning feature. If no feature owns it, create
   `features/<name>/` with `index.ts` and `tests/`.
3. Shared across features? Pure code goes to `lib/`, UI goes to `primitives/`.
4. Export new public pieces from `index.ts`; keep internals unexported.
5. Add or update tests in the feature's `tests/`: unit for pure helpers,
   component tests against `tests/helpers/liveblocks-mock.tsx`, e2e for
   user-visible flows.
6. Update `FEATURE_MAP.md` (behaviour and the feature → file index) and, if a
   route or script changed, this file.
7. Run Prettier on every file you edited (`npx prettier --write <files>`, or
   `npm run format` for everything). Never hand-format.
8. Run `npm run check`, then `npm run test:e2e` if any UI flow changed.

## Formatting

Prettier is the only formatter; its config is `.prettierrc` (same settings as
the monorepo root) and `.prettierignore` excludes build output. Rules:

- Run `npx prettier --write` on every file after editing it, including `.md`,
  `.css`, `.json` and `.mjs` files.
- `npm run format:check` is part of `npm run check` and fails on any unformatted
  file, so an unformatted file blocks a task from being done.
- Do not add formatting overrides (`// prettier-ignore` is a comment and is
  rejected by the comments policy anyway).

## Tooling notes

Explanations that used to live in code comments.

- **`next.config.ts`** sets `turbopack.root` to the monorepo root so Next does
  not pick up a parent lockfile. `distDir` honours `NEXT_DIST_DIR` so the e2e
  server builds into `.next-e2e`; when that variable is set, `devIndicators` is
  disabled because the dev tools badge overlaps the rail's user menu and
  swallows clicks.
- **`playwright.config.ts`** picks the backend from `LIVEBLOCKS_DEV_SERVER_PORT`
  (set by `liveblocks dev -P`) or `E2E_BACKEND=cloud`, and throws if neither is
  present. It blanks `AI_GATEWAY_API_KEY` so AI replies are the deterministic
  mock. The local dev server stubs REST feed endpoints, so flows through
  `/api/ai-reply` only pass against the cloud backend; `ai.spec.ts` skips itself
  when `IS_LOCAL_BACKEND` is true.
- **`vitest.config.ts`** aliases `@/` to the example root, runs everything in
  jsdom with `tests/setup.ts` (jest-dom matchers, cleanup, stubs for
  `ResizeObserver`, `scrollIntoView`, `CSS.escape`), and lets API tests opt into
  node via the pragma. CSS is not processed.
- **`tests/helpers/liveblocks-mock.tsx`** is an in-memory stand-in for
  `@liveblocks/react` and `@liveblocks/react/suspense`. Install it in a test
  with
  `vi.mock("@liveblocks/react/suspense", () => import("@/tests/helpers/liveblocks-mock"))`
  (and the same for `@liveblocks/react`), shape the world with
  `resetMockState()` / `setMockState()`, and assert on `liveblocksMocks.*` or
  the state. Mutation hooks both record calls and apply them to the state.
- **`tests/helpers/e2e.ts`** opens the app as a given demo user inside an
  isolated set of rooms (`exampleId` suffix) and exposes locators for the
  composer, channel headings, messages, rail tabs and so on.
- **`liveblocks.config.ts`** declares `Presence` (`typingIn`), `Storage`
  (`channels: LiveList<LiveObject<Channel>>`), `UserMeta`, `FeedMetadata` and
  `FeedMessageData` globally. Chat messages have no `kind`; activity items have
  `kind: "activity"`.
- **`liveblocks` (CLI)** is a devDependency only for `liveblocks dev`.
