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

Run all e2e tests:

```bash
npx turbo test:e2e
```

Run a specific test file:

```bash
npx turbo test:e2e -- e2e/list-insert.test.ts
```

**Note**: Since these tests run against an actual production deployment, they
require a `LIVEBLOCKS_PUBLIC_KEY` environment variable to connect to the
Liveblocks service.
