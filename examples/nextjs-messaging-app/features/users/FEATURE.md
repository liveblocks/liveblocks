# Users

## Sign in

- **Where:** the whole page, until you are signed in.
- **How:** with no session the app shows a "Sign in" card listing the demo users
  from `lib/database.ts`. Click one to sign in as that person. The clicked row
  shows a spinner and the list is disabled until the session exists; an error is
  shown under the list if sign-in fails.
- **Details:** sessions are real. They are issued by
  [Better Auth](https://better-auth.com) through a tiny `demo-login` plugin
  (`POST /api/auth/sign-in/demo` with `{ userId }`) and stored in an encrypted
  (JWE) cookie. There is no database: Better Auth runs in its stateless mode, so
  the cookie _is_ the session and is validated by signature and expiry alone.
  Sessions expire after a fixed lifetime (`SESSION_MAX_AGE` in `api/auth.ts`)
  and are refreshed in the background before they do. The AI teammate cannot
  sign in.
- **Why:** `/api/liveblocks-auth` reads the Better Auth session from the cookie
  and only issues a Liveblocks token for that user. The client never tells the
  server who it is.

## User switcher and sign out

- **Where:** avatar button at the bottom of the rail.
- **How:** click the avatar to open a "Switch user" list. Picking another user
  signs you in as them (a new cookie replaces the old one) and remounts the
  whole Liveblocks connection, so presence, feeds, and activity all reload for
  the new identity. "Sign out" clears the session and returns to the sign-in
  card. Escape or clicking outside closes the menu.
- **Details:** nothing about the identity is kept in `localStorage`; a reload
  restores the user from the cookie. Clearing cookies signs you out.

## Gallery preview mode

- **Where:** only when the URL has `?examplePreview=N` (the liveblocks.io
  gallery embeds several panes of the app as different users).
- **How:** the pane is signed in as demo user `N` without a cookie and without
  the sign-in card. The user switcher still works but only for that pane, and
  there is no "Sign out".
- **Why:** the panes are same-origin iframes and would share one cookie jar, so
  cookie sessions cannot make them different people. In this mode the client
  sends `previewUserId` to `/api/liveblocks-auth`, which honours it ahead of any
  cookie. This is the one place the client is trusted; it lives in
  `features/users/api/demo-login.ts` so it disappears together with demo login.

## Swapping in real authentication

1. Add a provider to `features/users/api/auth.ts` (for example
   `socialProviders: { github: { clientId, clientSecret } }`); OAuth works in
   stateless mode since account state is kept in an encrypted cookie too.
2. Delete `features/users/api/demo-login.ts` and the `demoLogin()` plugin, the
   `demoLoginClient()` plugin in `auth-client.ts`, and `getPreviewUser` in
   `liveblocks-auth.ts`.
3. Replace `lib/database.ts` with your user directory and update `/api/users`
   and `/api/users/search`.
4. Optionally add `database: …` to `betterAuth()` if you want server-side
   session revocation; nothing else changes.

## Files

- `features/users/sign-in.tsx`
- `features/users/user-menu.tsx`
- `features/users/use-current-user.ts`
- `features/users/auth-client.ts`
- `features/users/api/auth.ts`
- `features/users/api/demo-login.ts`
- `features/users/api/liveblocks-auth.ts`
- `features/users/api/users.ts`
- `features/users/api/users-search.ts`
- `lib/database.ts`
- Tests: `tests/`
