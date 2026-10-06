# Users

Join a room as one of the example's demo users and see who else is in it, by
name and avatar.

## Signing in

- Opening the app picks a random demo user for this browser tab; every tab can
  be a different person, so two tabs show two avatars.
- The auth endpoint accepts a `userId` and signs that user in; with no id, or an
  unknown id, it falls back to a random user or answers 403.
- A session may write to every room whose id starts with `liveblocks:examples:`,
  which is how the gallery isolates rooms per visitor.
- Without `LIVEBLOCKS_SECRET_KEY` the endpoint answers 403 and the app can't
  connect.

## Resolving users

- Presence UI (avatar stack, cursors, comments, mentions) looks user ids up
  through `/api/users`, which returns `name`, `avatar` and `color` per id, or
  `null` for unknown ids. `LiveblocksProvider` in `app/providers.tsx` wires this
  up as `resolveUsers`.
- Typing `@` in a comment composer searches users by name or id through
  `/api/users/search`; an empty query lists everyone
  (`resolveMentionSuggestions`).
- The AI assistant is a synthetic user with its own id, name and avatar so its
  chat messages render like any other author.

## Files

- `index.ts`: public surface (user lookups and the AI user's identity)
- `database.ts`: the in-memory list of demo users and the lookups over it
- `api/liveblocks-auth.ts`: `POST /api/liveblocks-auth`, signs a demo user in
- `api/users.ts`: `GET /api/users?userIds=`, resolves ids to user info
- `api/users-search.ts`: `GET /api/users/search?text=`, mention suggestions
- `tests/database.test.ts`: lookups, the resolve route and the search route
