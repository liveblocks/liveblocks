# Basic Auth todo

This sample runs a collaborative todo app against a self-hosted
`@liveblocks/server`. It uses the client's custom `AuthStrategy` API and does
not mint or parse a Liveblocks JWT.

Run it from the repository root:

```bash
pnpm exec turbo run dev --filter=@liveblocks/basic-auth-todo
```

Then open [http://localhost:3090](http://localhost:3090) in two browser tabs and
sign in as `alice / alice` and `bob / bob`.

## Authentication flow

1. The client sends an `Authorization: Basic …` header to `POST /api/auth`.
2. The server validates those credentials and returns an opaque, short-lived
   session ID—not a Liveblocks JWT.
3. The custom auth strategy wraps that session ID in an `AuthCredential`.
4. The Liveblocks client carries that credential in the WebSocket's `tok` query
   parameter.
5. `server.ts` validates the session itself and creates an `@liveblocks/server`
   ticket for the authenticated user.

Browser WebSocket APIs cannot set arbitrary request headers, which is why the
opaque session is transported in `tok` during the upgrade. In a real app, use
HTTPS and replace the hard-coded users and in-memory sessions with your own
credential and session stores.
