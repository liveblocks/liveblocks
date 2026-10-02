# Agent guide: nextjs-messaging-app

This file is the contract for anyone (human or agent) changing this example.
Read it before touching code. Each feature and view describes _what it does_ in
its own `FEATURE.md`, indexed from `FEATURE_MAP.md`; this file describes _how
the code is organised_ and _how to prove a change is correct_.

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
                  handlers, tests and behaviour doc (FEATURE.md).
views/            The screen regions that compose features into the page.
                  Same anatomy as a feature, minus api/.
primitives/       Small presentational building blocks reused by more than one
                  feature or view. Tests in primitives/tests/.
lib/              Shared domain model and helpers with no UI and no feature
                  dependencies. Tests in lib/tests/.
tests/            Shared test infrastructure only (setup, mocks, e2e helpers).
                  No test files live here.
scripts/          Repo tooling (structure check, test baseline, scaffolding).
FEATURE_MAP.md    Index of every FEATURE.md plus cross-cutting notes.
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
  FEATURE.md          user-observable behaviour of this feature + its file list
  <name>.ts           pure model code for the feature (ids, guards, helpers)
  <component>.tsx     one exported component per file, kebab-case file names
  api/<handler>.ts    Next.js route handlers (GET/POST), server-only
  tests/
    <module>.test.ts(x)   vitest: unit, component and API tests
    <name>.spec.ts        Playwright: end-to-end flows for this feature
```

- `tests/` is mandatory and must contain at least one test file.
- `FEATURE.md` is mandatory and must be linked from the table in
  `FEATURE_MAP.md`. It is the only place behaviour is documented, so parallel
  work on different features never edits the same doc file.
- Scaffold all of this with `npm run new:feature -- <kebab-name>` (also
  `new:view`, `new:primitive`). It refuses to overwrite existing files and
  prints the remaining manual steps.
- A test file is named after the module it covers (`channel-list.test.tsx`
  covers `channel-list.tsx`). E2E specs are named after the feature.
- `.test.` is vitest, `.spec.` is Playwright. Never mix.
- API tests start with the `// @vitest-environment node` pragma; everything else
  runs in jsdom.
- Views follow the same anatomy (`views/<name>/index.ts`, `FEATURE.md`,
  `tests/`) minus `api/`.
- Primitives and `lib/` modules are single files; their tests live in a shared
  `tests/` folder beside them, one test file per module:
  `primitives/unread-badge.tsx` → `primitives/tests/unread-badge.test.tsx`,
  `lib/feeds.ts` → `lib/tests/feeds.test.ts`. Every module there must have one.

One rule covers every layer: tests live in a `tests/` folder next to the code
they cover, never as sibling files.

## Feature inventory

| Feature                    | Owns                                                                                                                                                                                                                  | May import from features           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `features/users`           | Better Auth (`api/auth.ts`, `api/demo-login.ts`, `auth-client.ts`), `useCurrentUser`, `useUserStatus`, `sign-in.tsx`, account menu (`user-menu.tsx`); `api/liveblocks-auth.ts`, `api/users.ts`, `api/users-search.ts` | —                                  |
| `features/workspaces`      | Workspace list and themes (`workspaces.ts`), `workspace-switcher.tsx`                                                                                                                                                 | —                                  |
| `features/channels`        | `channels.ts` (`DEFAULT_CHANNELS`, `createInitialStorage`), `channel-list.tsx` (CRUD, reorder, badges), `channel-members.tsx`                                                                                         | `activity`                         |
| `features/direct-messages` | `direct-message-list.tsx` (compact + detailed lists)                                                                                                                                                                  | `activity`                         |
| `features/messages`        | `message.tsx` (hover toolbar, reactions, reply pill), `message-list.tsx` (scrolling, intros), `message-items.ts` (grouping, dividers)                                                                                 | —                                  |
| `features/composer`        | `composer.tsx`, `composer.css`, `mention-suggestions.tsx`, `serialize-markdown.ts`, `typing-indicator.tsx`                                                                                                            | `activity`, `ai`                   |
| `features/threads`         | `thread-panel.tsx`                                                                                                                                                                                                    | `activity`, `composer`, `messages` |
| `features/activity`        | `activity.ts` (root feed, unread rule), `use-activity.ts` (hooks), `activity-panel.tsx`                                                                                                                               | —                                  |
| `features/ai`              | `api/ai-reply.ts` (streaming reply handler), `request-ai-reply.ts` (client trigger used by the composer)                                                                                                              | —                                  |
| `features/help`            | `help-button.tsx` (gallery help modal)                                                                                                                                                                                | —                                  |

The last column is the current dependency graph between features. It is acyclic
and `lint:structure` keeps it that way. Adding an edge is fine; adding a cycle
is not — move the shared piece to `lib/` instead (that is why
`getThreadParticipantIds` lives in `lib/threads.ts`, not `features/threads`: the
AI route needs it and the composer needs the AI route).

### Views

| View                 | Exports                          | Owns                                                                                                                                                  |
| -------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `views/app-shell`    | `AppShell`, `AppLoadingFallback` | session gate (loading / sign-in / app), providers, workspace/room selection, `initialPresence` status seed, theming, selection fallbacks, page layout |
| `views/rail`         | `Rail`                           | workspace switcher, Home/DMs/Activity tabs with badges, account menu trigger                                                                          |
| `views/sidebar`      | `Sidebar`                        | picks channel list, DM list or activity panel for the active tab                                                                                      |
| `views/conversation` | `ConversationView`               | header (channel/DM), members, help, message list, composer, thread panel                                                                              |

### Primitives

`avatar.tsx`, `unread-badge.tsx`, `column-header.tsx`, `resize-handle.tsx`
(`ResizeHandle`), `preview-row.tsx` (`PreviewRow`, `MessagePreview`,
`UnreadDot`, `PreviewSkeleton`), `markdown.tsx` (`Markdown`, `InlineMarkdown`),
`emoji-picker-popover.tsx` (reactions and account status), `status-emoji.tsx`
(status emoji beside names).

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
| `lib/panel-width.ts`                      | Resizable panel widths: `SIDEBAR_PANEL`, `THREAD_PANEL` configs, `clampPanelWidth`, `readPanelWidth`/`writePanelWidth` (localStorage), `usePanelWidth` hook                               |
| `lib/view-state.ts`                       | Remembered view per room: `ViewState`, `parseViewState`, `readViewState`/`writeViewState` (sessionStorage first, then localStorage)                                                       |
| `lib/time.ts`                             | `formatTime`, `formatDayLabel`                                                                                                                                                            |
| `lib/status.ts`                           | Per-user status persistence in localStorage (`readStatus`, `writeStatus`, `normalizeStatus`, `hasStatus`, `isActive`)                                                                     |
| `lib/presence.ts`                         | `useUserPresence` — merged map of user id to online/away and status for lists and headers                                                                                                 |
| `lib/example.ts`, `lib/example.client.ts` | Gallery integration (`exampleId`, `examplePreview`)                                                                                                                                       |

Every `lib/` module has a test in `lib/tests/` (`lib/tests/feeds.test.ts`).

## Comments policy

The code contains **no comments**. Not in sources, tests, styles or config
files. The only permitted comment lines are tool directives:

- `// @vitest-environment node`
- `// @ts-expect-error …`, `// @ts-ignore …`
- `// eslint-disable-next-line <rule>` for a deliberate, single-line exception
  (see [Linting](#linting)); never a file-wide `eslint-disable`
- `/* … */` license headers in third-party-derived files (none today)

Anything that would need a comment goes somewhere discoverable instead:

- behaviour a user can observe → the owning `FEATURE.md`
- structure, tooling, non-obvious config (why `.next-e2e` exists, why the AI key
  is blanked in e2e) → this file, under [Tooling notes](#tooling-notes)
- a tricky invariant → a test whose name states the invariant

`scripts/check-structure.mjs` fails on any other comment. The detector is
line-based, not a parser: it ignores `//` inside string, template and regex
literals, but a regex literal containing `/*` will be flagged. Rewrite the regex
(e.g. `\/\*`) rather than adding an exception.

## Markdown is not the source of truth

`README.md`, `FEATURE_MAP.md`, every `FEATURE.md` and this file describe
_behaviour_. The code is the source of truth for anything that could change
without the behaviour changing, so none of the following belongs in a Markdown
file:

- counts ("the five demo users", "up to five avatars", "seven days")
- names and ids of demo data (user names, channel names, workspace names)
- durations, thresholds, dimensions and other tuning constants
- example strings that embed any of the above ("Charlie Layne mentioned you in
  #general")

Write "the demo users", "a capped row of avatars", "a fixed lifetime", and point
at the constant or module that holds the value when it helps (`SESSION_MAX_AGE`
in `api/auth.ts`, `lib/database.ts`). Placeholders are fine in example strings:
"<name> mentioned you in #<channel>". If a reader needs the actual value, they
read the code; if a doc would go stale when a constant is edited, it is
describing the wrong thing.

The exception is this file's own tooling notes, where concrete ports, paths and
script names are the point and are kept in sync with `package.json` and the
config files they describe.

## Verification

Run these from `examples/nextjs-messaging-app/`. A change is not done until the
relevant set is green.

| Command                  | What it proves                                                               | When                                          |
| ------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------- |
| `npm run typecheck`      | `tsc --noEmit` passes                                                        | after every series of edits                   |
| `npm run lint`           | ESLint (Next + hooks + TypeScript rules), zero warnings allowed              | after every series of edits                   |
| `npm run lint:structure` | layers, barrel-only imports, no cycles, anatomy, test placement, no comments | after moving or adding files                  |
| `npm run format:check`   | every file is Prettier-formatted (`.prettierrc`)                             | before declaring any task done                |
| `npm test`               | all vitest suites (unit, component, API)                                     | after every series of edits                   |
| `npm run test:baseline`  | `npm test` + no tests were lost versus `tests/baseline.json`                 | before declaring any task done                |
| `npm run check`          | typecheck, lint, lint:structure, format:check, test:baseline, in order       | before declaring any task done                |
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

### Test baseline

`tests/baseline.json` records how many vitest and Playwright files and tests
exist. `npm run test:baseline` (part of `check`) compares the current counts
against it:

- fewer files or tests than the baseline → fails. Tests may only be removed
  deliberately; say so in the PR and lower the numbers in `baseline.json` by
  hand.
- more → the script rewrites `baseline.json` with the new counts. Commit it.

The Playwright numbers come from `playwright test --list`, so they need no
browser or server. Two tests in `features/ai/tests/ai.spec.ts` skip themselves
on the local dev server; they still count.

### Running the app without keys

`npm run dev:local` starts a throwaway Liveblocks dev server and `next dev` on
port 3100 (dist dir `.next-local`, so it can run next to your normal
`npm run dev` on 3000). No `.env.local` is needed; the session endpoint and the
client are pointed at the local server automatically. Use it to poke at the UI
or `curl` the API routes while developing.

### Environment

- `npx playwright install chromium` once.
- `npm run test:e2e` needs no keys: `liveblocks dev -P` starts a local server
  and injects `LIVEBLOCKS_SECRET_KEY` and `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL`.
  Better Auth falls back to its development secret when `BETTER_AUTH_SECRET` is
  unset; only production deployments must set it.
- `npm run test:e2e:cloud` needs `LIVEBLOCKS_SECRET_KEY` in `.env.local`; the AI
  flows in `ai.spec.ts` also need `AI_GATEWAY_API_KEY`. See `.env.example`.
- The e2e suite starts `next dev` on port 3111 with `NEXT_DIST_DIR=.next-e2e` so
  it can run next to a dev server you already have on 3000.

### Locating elements in e2e specs

Follow Playwright's locator priority, and never pick an element by its position
in the DOM.

1. **Role and accessible name first.**
   `getByRole("button", { name: "#general", exact: true })`,
   `getByRole("heading", { name, level: 2 })`, `getByLabel("3 unread")`. This is
   what keeps the tests asserting that the UI is accessible; a row that stops
   being a button, or a heading that loses its level, must fail the test.
2. **Scope by landmark, not by order.** Regions that appear more than once get
   an `aria-label` and are selected by name:
   `getByRole("complementary", { name: "Sidebar" })`,
   `getByRole("complementary", { name: "Thread" })`,
   `getByRole("region", { name: "Conversation" })`. The helpers `sidebar()`,
   `threadPanel()` and `conversation()` wrap these; `composer()` and
   `messageByText()` default to the conversation region so the thread panel's
   copies never collide with them.
3. **Rows in repeating lists carry a domain id.** When a row's accessible name
   is not unique (DM rows include the latest message preview, which can mention
   any user), the `<li>` gets a `data-*` attribute with the id the UI already
   has: `data-user-id` on DM rows, `data-message-id` on messages. Helpers take
   the object, not the display name (`dmRow(page, MISLAV)`, not
   `dmRow(page, "Mislav Abha")`). Prefer a domain id over `data-testid`; the
   attribute is part of the DOM contract, not a test hook, and reads the same in
   DevTools.
4. **Unique test data over filters.** Message text in specs comes from
   `uniqueText()`, so `messageByText()` matches exactly one element. Do not
   filter on a substring that another message could contain.
5. **`.first()`, `.last()` and `.nth()` are not disambiguators.** They hide
   strict-mode failures and make a test pass by accident of ordering. The one
   accepted use is when order _is_ the behaviour under test
   (`activityRows(page).first()` means "the newest item" because the Activity
   panel sorts newest first). If a locator matches more than one element, fix
   the locator with a name, a scope or a domain id instead.

Adding a new list? Give its rows a `data-<entity>-id`, add a helper to
`tests/helpers/e2e.ts` that takes the entity object, and keep role queries for
everything inside the row.

## Adding or changing a feature

1. Read the feature's `FEATURE.md` and `index.ts`.
2. Put new code in the owning feature. If no feature owns it, run
   `npm run new:feature -- <name>` and follow the printed steps.
3. Shared across features? Pure code goes to `lib/`, UI goes to `primitives/`
   (`npm run new:primitive -- <name>`).
4. Export new public pieces from `index.ts`; keep internals unexported.
5. Add or update tests in the feature's `tests/`: unit for pure helpers,
   component tests against `tests/helpers/liveblocks-mock.tsx`, e2e for
   user-visible flows.
6. Update the feature's `FEATURE.md` (behaviour and its file list). Touch
   `FEATURE_MAP.md` only to add a row for a new feature or view, and this file
   only if a route, script or rule changed.
7. Run Prettier on every file you edited (`npx prettier --write <files>`, or
   `npm run format` for everything). Never hand-format.
8. Run `npm run check`, then `npm run test:e2e` if any UI flow changed. Commit
   `tests/baseline.json` if it changed.

## Linting

`npm run lint` runs ESLint with `eslint-config-next` (core web vitals +
TypeScript) and `--max-warnings 0`, so warnings block too. Config is
`eslint.config.mjs`. Deliberate deviations:

- `@next/next/no-img-element` is off: avatars are external URLs and `next/image`
  would add nothing but config.
- Unused variables and arguments prefixed with `_` are allowed.
- The React Compiler rules `react-hooks/set-state-in-effect` and
  `react-hooks/refs` stay on. Three effects in the codebase intentionally set
  state (page-until-found loops in `message-list.tsx` and `activity-panel.tsx`,
  selection normalisation in `app-shell.tsx`) and carry a
  `// eslint-disable-next-line react-hooks/set-state-in-effect`. Prefer
  restructuring over adding a fourth; if you must, the disable goes on exactly
  that line.

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
  present. The local dev server stubs REST feed endpoints, so flows through
  `/api/ai-reply` only pass against the cloud backend (with an
  `AI_GATEWAY_API_KEY` in `.env.local`); `ai.spec.ts` skips itself when
  `IS_LOCAL_BACKEND` is true.
- **`vitest.config.ts`** aliases `@/` to the example root, runs everything in
  jsdom with `tests/setup.ts` (jest-dom matchers, cleanup, stubs for
  `ResizeObserver`, `scrollIntoView`, `CSS.escape`, pointer capture
  (`setPointerCapture` and friends)), and lets API tests opt into node via the
  pragma. CSS is not processed.
- **`tests/helpers/liveblocks-mock.tsx`** is an in-memory stand-in for
  `@liveblocks/react` and `@liveblocks/react/suspense`. Install it in a test
  with
  `vi.mock("@liveblocks/react/suspense", () => import("@/tests/helpers/liveblocks-mock"))`
  (and the same for `@liveblocks/react`), shape the world with
  `resetMockState()` / `setMockState()`, and assert on `liveblocksMocks.*` or
  the state. Mutation hooks both record calls and apply them to the state.
- **`tests/helpers/e2e.ts`** opens the app as a given demo user inside an
  isolated set of rooms (`exampleId` suffix) and exposes locators for the
  composer, channel headings, messages, rail tabs, the rail account menu trigger
  (`userMenuButton`, `openAccountMenu`, `accountMenu`) and so on. `openApp` uses
  `?examplePreview=N` (gallery preview mode, no cookie) so multi-user specs stay
  fast and cookie-free; `openSignIn` + `signInAs` go through the real Better
  Auth sign-in card for the specs in `features/users`. Locator rules are in
  [Locating elements in e2e specs](#locating-elements-in-e2e-specs).
- **`tests/helpers/auth.ts`** calls the Better Auth route handler directly
  (`signInDemo`, `demoSessionCookie`) so API tests can obtain a real session
  cookie without a server.
- **Authentication** is Better Auth in stateless mode: `betterAuth()` in
  `features/users/api/auth.ts` has no `database`, so sessions live in an
  encrypted JWE cookie and `auth.api.getSession` never touches storage (an
  in-memory adapter is created internally for transient writes; nothing reads it
  back). `api/demo-login.ts` is a Better Auth plugin adding
  `POST /sign-in/demo`; `auth-client.ts` mirrors it on the client with
  `$InferServerPlugin` (the `{} as ReturnType<typeof demoLogin>` cast is Better
  Auth's documented pattern for typing client plugins) and an `atomListeners`
  entry so `useSession` refetches after a demo sign-in. `api/liveblocks-auth.ts`
  trusts the cookie, except for `previewUserId` in gallery preview mode (see
  `features/users/FEATURE.md`). Better Auth logs a "Base URL is not set" warning
  once at startup; set `BETTER_AUTH_URL` to silence it.
- **`liveblocks.config.ts`** declares `Presence` (`typingIn`, optional `status`
  with emoji, text, and away), `Storage`
  (`channels: LiveList<LiveObject<Channel>>`), `UserMeta`, `FeedMetadata` and
  `FeedMessageData` globally. Chat messages have no `kind`; activity items have
  `kind: "activity"`.
- **`liveblocks` (CLI)** is a devDependency only for `liveblocks dev`.
- **`scripts/`**: `check-structure.mjs` (architecture rules),
  `check-test-baseline.mjs` (test counts), `scaffold.mjs` (`new:*` commands).
  All plain Node, no dependencies.
- **`.next-local`** is the dist dir for `npm run dev:local`, for the same reason
  `.next-e2e` exists: Next refuses two dev servers sharing one dist dir.
