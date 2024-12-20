# `@liveblocks/core`

Shared code and foundational internals for all other Liveblocks packages. None
of the APIs exposed by this package are considered stable or public. Please **do
not import anything directly from this package**.

## Run e2e tests locally

- At the `packages/liveblocks-core` root level, add a file `.env`
- In this file, add the environment variable:
  `LIVEBLOCKS_PUBLIC_KEY="pk_YOUR_PUBLIC_API_KEY"`
- Run `turbo run test:e2e`
