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

- To run scripts, use `npx turbo`, not `npm`
- npx turbo run build: Build the project
- npx turbo run build && tsc: Run typechecks
- npx turbo run test:types: Run the type-level tests
- npx turbo run lint:package: Run package tests

# Code style

- Use $-suffix for variables storing Promises
- Use Σ-suffix for variables storing Signals (MutableSignal, Signal,
  DerivedSignal, etc)

# Workflow

- Be sure to typecheck when you’re done making a series of code changes
- Prefer running single tests, and not the whole test suite, for performance
