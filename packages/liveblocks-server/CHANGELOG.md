## vNEXT (not yet released)

## v1.6.2

- Fix route parity

## v1.6.1

- Fix a `LiveList` divergence after reconnects: when a client re-sends a pending
  `push` op whose node the server had already stored (the original ack got lost
  in the disconnect)

## v1.6.0

- Update internal storage format of dev server. Note that your local dev rooms
  are not automatically migrated and will appear as empty rooms after the
  upgrade.

## v1.5.0

- Add `--random-port` (`-P`) flag to `liveblocks dev`: bind a random free port
  instead of an explicit port number. With `--cmd` (`-c`), the chosen port is
  exposed to the command via `LIVEBLOCKS_DEV_SERVER_PORT`. Ideal for CI (no port
  collisions ever).
- Fix `LiveList.push()` so concurrent pushes from multiple clients no longer
  settle out of order.

## v1.4.1

- Fix: `client.getOrCreateRoom()` no longer errors when the room already exists,
  matching production behavior.
- Fix: Yjs document updates made via `PUT /v2/rooms/<roomId>/ydoc` now get
  broadcast to connected WebSocket clients, matching production behavior.

## v1.4.0

- Add support for `client.mutateStorage()` (from `@liveblocks/node`)

## v1.3.0

- Add feeds support (`feeds:write` permission)
- Add verbose logging toggle
- Fix permission validation to accept all valid permission combinations
- Support passing extra arguments to `--cmd` (`-c`), appended to the command or
  replacing `{}` if present

## v1.2.0

- Add live socket inspector view
- Add maintenance mode toggle (to reject new WebSocket connections)

## v1.1.0

### Added

- ID token authentication support
- Read-only rooms support
- Room permissions and room metadata
- Room filtering support

### Changed

- Room Node.js methods and REST APIs are now fully supported

See https://liveblocks.io/docs/tools/dev-server for the updated feature matrix.

## v1.0.17

Initial release. Dev server supports:

- Storage (all CRDTs)
- Presence
- Broadcast
- Text editors (Tiptap, BlockNote, Lexical)
- Public key authentication
- Access token authentication
- Room Node.js methods and REST APIs (partial)

See https://liveblocks.io/docs/tools/dev-server for all details.
