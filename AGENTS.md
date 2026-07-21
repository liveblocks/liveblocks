# Project structure

This is a monorepo. Most relevant projects live in `packages/` directory.

Dependency hierarchy is:

- @liveblocks/core
  - @liveblocks/client
    - @liveblocks/node
    - @liveblocks/react
      - @liveblocks/react-ui
    - @liveblocks/zustand
    - @liveblocks/redux

@liveblocks/core contains utility functions and types that are used by all other
packages, including the Liveblocks backend (not part of this monorepo). It is a
_private_ package. Customers should not use it directly.

# Bash commands

When running scripts, use `pnpm exec turbo`, not `pnpm run` directly.

- pnpm exec turbo run build: Build the project
- pnpm exec turbo run build && tsc: Run typechecks
- pnpm exec turbo run test:types: Run the type-level tests
- pnpm exec turbo run lint:package: Run package tests

# Code style

- Always try to add proper typing, limit the use of `any`. If needed, ask first.
- Use $-suffix for variables storing Promises
- Use Σ-suffix for variables storing Signals (MutableSignal, Signal,
  DerivedSignal, etc)

# Dependencies

- When adding new peerDependencies, pin them to major version ranges initially
  (e.g. `"^13"` for yjs, `"^1"` for y-prosemirror, `"^18 || ^19"` for react).
  Widen after verification. To support multiple major versions, use
  `"^1 || ^2"`.

# Code quality

- Never use `as` casts blindly -- explain the type issue and let me decide. If
  that would interrupt the flow, leave an `// XXX` comment above it explaining
  the issue instead (CI lint will flag it)
- Never add vitest/globals -- use explicit imports
- Always prefer the Liveblocks dev server for tests, over a mocked websocket
  server

# Workflow

- Be sure to typecheck when you're done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance

# Testing

- End-to-end applications are located in e2e/
- For Storage, Presence, Inbox Notifications, Comments & Threads the app is
  located in e2e/next-sandbox
- For AI the app is in e2e/next-ai-kitchen-sink

Run e2e tests headlessly using Playwright:  
pnpm exec turbo build && env HEADLESS=1 playwright test --retries=5 --

# Examples

Examples live in the `examples/` directory but are NOT part of the monorepo
workspace. They depend on the latest _published_ version of Liveblocks packages,
not on the local source. You cannot test examples against local changes. They
need to be updated separately when a new version is published.

# Documentation

All documentation lives in the `docs/` directory, as Markdown files.

When adding a new page (e.g. an upgrading guide), the `.mdx` file alone is not
enough. You must also register it in `docs/routes.json` or it won't be routable.

# Changelog

CHANGELOG.md entries should use public-facing package names as subheadings (e.g.
``### `@liveblocks/client` `` or ``### `@liveblocks/react` ``), not generic
categories like "Breaking changes" or "New features". Avoid referencing
`@liveblocks/core` — it is not a public-facing package.

# Packages maintained elsewhere

The following packages are primarily maintained from our backend monorepo for
ease of changes. If you have access to the Liveblocks backend repo, avoid making
changes to them directly here — prefer editing the source in the backend repo.

- `packages/liveblocks-server`
- `tools/liveblocks-cli`

# Cursor Cloud specific instructions

## When you do NOT need to build/run anything

Many tasks require no build, dev server, or running app. In particular, editing
`docs/`, `examples/`, `tutorial/`, `guides/`, and `starter-kits/` (all of which
live outside the pnpm workspace and depend on _published_ packages) does not
require building the local packages or starting the dev server. Skip that setup
for those tasks.

## Toolchain

- Node `>=24` is required and enforced (`engineStrict: true`). The environment
  installs Node 24 via `nvm` and pins it in `~/.bashrc`; the default
  `/exec-daemon/node` is an older Node that would fail `pnpm install`. If a
  shell shows the wrong Node version, run `nvm use 24.14.1`.
- `pnpm` comes from `corepack` (pinned to `pnpm@10.33.0` via `packageManager`).
- Standard build/test/lint commands are documented above (use `pnpm exec turbo`).

## Local Liveblocks dev server (backend for e2e apps)

The `e2e/` Next.js apps need a Liveblocks backend. Prefer the local dev server
over cloud keys. It runs as a Docker container (matching CI):

    docker run -d --name liveblocks-dev -p 1153:1153 ghcr.io/liveblocks/dev-server

Health check: `curl localhost:1153/health` → `200`. It accepts only the local
keys `pk_localdev` (public) and `sk_localdev` (secret). Docker is preinstalled;
if the daemon is not running, start it with `sudo dockerd` (configured with
`fuse-overlayfs` + iptables-legacy for docker-in-docker).

Note the port split: the published image listens on `1153`, but the
`*.devserver.test.ts` unit tests default to `1154`
(`process.env.LIVEBLOCKS_DEV_SERVER_PORT`). Point those tests at a running
server with e.g. `LIVEBLOCKS_DEV_SERVER_PORT=1153`.

### Important version-skew caveat

The published `ghcr.io/liveblocks/dev-server:latest` image lags the source in
this repo. It only understands the legacy permission scopes (`room:write`,
`room:read`, `comments:write`, `feeds:write`, `room:presence:write`,
`comments:read`) and rejects the newer base scope `*:write` (which the current
`@liveblocks/node` `session.FULL_ACCESS` emits) with HTTP 422. Consequences:

- next-sandbox pages that authenticate via `/api/auth/access-token` or
  `/api/auth/id-token` (i.e. `session.FULL_ACCESS` → `*:write`) fail to connect
  against the `latest` image. The public-key pages (e.g.
  `/auth/pubkey?room=...`) work, because permissions are assigned server-side.
- Some `*.devserver.test.ts` storage-sync tests may fail against `latest`. The
  `*.mockserver.test.ts` suites are the authoritative unit tests and pass
  independently of the dev server.

To fully exercise `*:write`-based flows you need a dev-server image built from a
matching version (from the backend repo), not `latest`.

## Running an e2e app

Each `e2e/` app reads env from its own `.env.local` (git-ignored). For the local
dev server use:

    LIVEBLOCKS_SECRET_KEY=sk_localdev
    NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_localdev
    NEXT_PUBLIC_LIVEBLOCKS_BASE_URL=http://localhost:1153

Ports (`pnpm run dev`): next-sandbox `3007`, next-ai-kitchen-sink `3008`,
next-react-flow-kitchen-sink `3008` (conflicts with ai-kitchen-sink — don't run
both), next-feeds `3009`. `node-sandbox` has no dev server (Vitest only).

The e2e apps' _production_ `next build` collects page data and will fail without
valid keys; that's expected — run them with `pnpm run dev` for development.
