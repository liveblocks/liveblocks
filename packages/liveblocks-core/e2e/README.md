# E2E Client Spec Tests

This test suite validates the end-to-end behavior of Liveblocks core CRDT
operations across multiple clients. These tests ensure that collaborative data
structures maintain consistency and handle concurrent operations correctly in
real-world scenarios.

## Test Coverage

- **LiveList operations**: Insert, move, set, and undo operations across
  multiple clients
- **LiveMap operations**: Concurrent modifications and synchronization
- **Consistency validation**: Ensures all clients converge to the same state
  after operations
- **Conflict resolution**: Tests edge cases where operations may conflict during
  collaboration

## Test Types

- **Single client tests**: Validate operations on a single client instance
- **Multi-client tests**: Test concurrent operations across multiple connected
  clients
- **Consistency tests**: Specifically test scenarios that could lead to
  divergent states

## Purpose

These tests are critical for ensuring the reliability of Liveblocks'
collaborative features. They catch bugs related to operational transformation,
conflict resolution, and state synchronization that could cause data
inconsistencies in production applications.

## Running Tests

### Against the local dev server (recommended for development)

Start the dev server in a separate terminal:

```bash
bunx liveblocks dev --port 1153
```

Then run e2e tests:

```bash
npm run test:e2e:devserver
```

With WASM engine:

```bash
LIVEBLOCKS_ENGINE=wasm npm run test:e2e:devserver
```

All 44 e2e tests are compatible with the local dev server. The dev server uses
`pk_localdev` as the public key and runs on `http://localhost:1153`.

### Against the production API

```bash
LIVEBLOCKS_PUBLIC_KEY=pk_... npm run test:e2e
```

Or with turbo:

```bash
npx turbo test:e2e
```

### Running a specific test file

```bash
npm run test:e2e:devserver -- e2e/list-insert.test.ts
```
