# Next.js form local dev server

## Goal

Let developers run `examples/nextjs-form` without a Liveblocks account by
starting both the Liveblocks dev server and Next.js with `npm run dev:local`.

The example is a suitable pilot because it only uses fully supported local dev
server features: Liveblocks Storage and Presence. It does not use Comments,
Notifications, Webhooks, or unsupported REST and Node.js methods. Any future
Room REST or Node.js methods added to the example must also remain within the
dev server's supported Room APIs.

## Design

Add a `dev:local` package script that runs `npx liveblocks dev --cmd` and passes
the local server URL and `sk_localdev` secret only to the child `next dev`
process. Keep the existing `dev` command and `.env.example` cloud setup
unchanged.

Both Liveblocks call sites must accept the optional base URL:

- `LiveblocksProvider` reads `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL`.
- The server-side `Liveblocks` client reads the same variable alongside
  `LIVEBLOCKS_SECRET_KEY`.

The README should present `npm run dev:local` as the complete local setup. The
CLI starts a fresh ephemeral server, runs Next.js, and stops the server when
Next.js exits, so local Storage does not persist between runs.

## Verification

- Install the example's existing dependencies if needed.
- Start `npm run dev:local` and confirm both servers become available.
- Request the app and its Liveblocks auth endpoint.
- Confirm the normal `npm run dev` command remains unchanged.

