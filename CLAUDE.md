# Project structure

This is a monorepo. Most relevant projects live in `packages/` directory.

Dependency hierchy is:

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

When running scripts, use `npx turbo`, not `npm`.

- npx turbo run build: Build the project
- npx turbo run build && tsc: Run typechecks
- npx turbo run test:types: Run the type-level tests
- npx turbo run lint:package: Run package tests

# Code style

- Always try to add proper typing, limit the use of `any`. If needed, ask first.
- Use $-suffix for variables storing Promises
- Use Σ-suffix for variables storing Signals (MutableSignal, Signal,
  DerivedSignal, etc)

# Workflow

- Be sure to typecheck when you're done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance

# Testing

- End-to-end applications are located in e2e/
- For Storage, Presence, Inbox Notifications, Comments & Threads the app is
  located in e2e/next-sandbox
- For AI the app is in e2e/next-ai-kitchen-sink

Run e2e tests headlessly using Playwright:  
npx turbo build && env HEADLESS=1 playwright test --retries=5 --

# Documentation

All documentation lives in the `docs/` directory, as Markdown files.

# Packages maintained elsewhere

The following packages are primarily maintained from our backend monorepo for
ease of changes. If you have access to the Liveblocks backend repo, avoid making
changes to them directly here — prefer editing the source in the backend repo.

- `packages/liveblocks-server`
- `packages/liveblocks-zenrouter`
- `tools/liveblocks-cli`
