## vNEXT (not yet released)

- ...

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
