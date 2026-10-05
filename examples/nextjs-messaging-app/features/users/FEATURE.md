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

## Account menu

- **Where:** the rail trigger at the bottom of the rail (`user-menu.tsx`).
- **How:** click the trigger to open an "Account menu" dialog. Escape or
  clicking outside closes it. The trigger shows your avatar, a presence dot
  (green when you are active, gray when away), and—when you have set a status—an
  emoji in a small box above the avatar with a hover tooltip for the status
  text.

### Status

- **How:** pick an emoji through the shared emoji picker
  (`primitives/emoji-picker-popover.tsx`), type a short line of text, and save
  with **Enter** (which also closes the menu) or by leaving the field. **Clear
  status** removes emoji and text.
- **Details:** status is part of room Presence (`liveblocks.config.ts`: optional
  `status` with emoji, text, and away). Your last status is persisted per user
  in localStorage via `lib/status.ts` (`readStatus`, `writeStatus`,
  `normalizeStatus`, `hasStatus`, `isActive`) and seeded into the room through
  `initialPresence` in `views/app-shell/app-shell.tsx`. Updates go through
  `useUserStatus` in `use-user-status.ts`, which writes both Presence and
  storage. Other surfaces read merged presence through `lib/presence.ts`
  (`useUserPresence`).

### Away and online

- **How:** toggle **Set yourself as away** / **Set yourself as active**. The
  menu closes on click. Away keeps you connected but marks you inactive for
  presence (gray dot, "Away" labels elsewhere).

### Sign out

- **How:** **Sign out** clears the Better Auth session and returns to the
  sign-in card. Hidden in gallery preview mode (see below).
- **Details:** identity comes from the session cookie, not from `localStorage`;
  reloading restores the signed-in user from the cookie. Clearing cookies signs
  you out.

## Gallery preview mode

- **Where:** only when the URL has `?examplePreview=N` (the liveblocks.io
  gallery embeds several panes of the app as different users).
- **How:** the pane is signed in as demo user `N` without a cookie and without
  the sign-in card. The account menu works for that pane's status and
  away/online toggle; there is no **Sign out**.
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
- `features/users/use-user-status.ts`
- `features/users/auth-client.ts`
- `features/users/api/auth.ts`
- `features/users/api/demo-login.ts`
- `features/users/api/liveblocks-auth.ts`
- `features/users/api/users.ts`
- `features/users/api/users-search.ts`
- `lib/database.ts`
- `lib/status.ts`
- `liveblocks.config.ts` (Presence `status` shape)
- Tests: `tests/`
