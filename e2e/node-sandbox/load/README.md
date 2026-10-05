# Node SDK load test

This harness drives the real `@liveblocks/client` SDK using Node WebSockets. It
tests anonymous client connections, storage mutation propagation,
synchronization, and final-state convergence against an explicit Liveblocks
endpoint. It does not launch actual browsers.

Commands below run from the `liveblocks/` repository root. Install workspace
dependencies if needed:

```sh
pnpm install
pnpm exec turbo run build --filter=node-sandbox
```

Set these variables in your shell, or in `e2e/node-sandbox/.env.local`:

```dotenv
LIVEBLOCKS_BASE_URL=https://your-self-hosted-api.example.com
LIVEBLOCKS_PUBLIC_KEY=your-public-project-key
LIVEBLOCKS_SECRET_KEY=your-secret-project-key
```

Start with the smoke workload:

```sh
pnpm exec turbo run load:smoke --filter=node-sandbox
```

The full workload ramps **500 connections across 50 rooms** over 60 seconds,
then holds them for 15 minutes. Every room has ten clients, five of whom each
replace their own writer entry once per second. The other five receive updates.
Every client loads and subscribes to Storage. Each writer value contains a
sequence, a timestamp, and a 256-byte ASCII payload; the map stays bounded.

```sh
pnpm exec turbo run load --filter=node-sandbox

# Five mutations/sec/writer: 1,250 mutations/sec across the deployment
pnpm exec turbo run load --filter=node-sandbox -- --mutation-rate 5

# Shorter exploratory run, optionally retaining its rooms
pnpm exec turbo run load --filter=node-sandbox -- --hold-seconds 60 --keep-rooms

# All options; --report paths resolve from e2e/node-sandbox/
pnpm exec turbo run load --filter=node-sandbox -- --help
```

Options are `--rooms`, `--clients-per-room`, `--writers-per-room`,
`--mutation-rate`, `--payload-bytes`, `--ramp-seconds`, `--hold-seconds`,
`--report`, and `--keep-rooms`. Smoke defaults are two rooms, a five-second
ramp, and a ten-second hold. Explicit options override profile defaults.
Durations are seconds; the payload byte count excludes sequence/timestamp and
protocol overhead. Keep at least two clients per room and one writer. Mutation
rates range from 0.001 to 1,000/sec/writer; high rates will be batched by the
SDK.

## Local validation

Start the local dev server in another terminal (Bun is required):

```sh
pnpm dlx liveblocks dev --port 1153
```

Then run scoped verification and the real SDK smoke workload:

```sh
pnpm exec turbo run typecheck --filter=node-sandbox
pnpm exec turbo run test --filter=node-sandbox -- test/load.test.ts
LIVEBLOCKS_BASE_URL=http://localhost:1153 \
LIVEBLOCKS_PUBLIC_KEY=pk_localdev \
LIVEBLOCKS_SECRET_KEY=sk_localdev \
pnpm exec turbo run load:smoke --filter=node-sandbox
```
