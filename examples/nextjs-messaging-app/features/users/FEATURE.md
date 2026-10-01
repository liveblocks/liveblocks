# Users

## Fake login / user switcher

- **Where:** avatar button at the bottom of the rail.
- **How:** click the avatar to open a "Switch user" list of the five demo users
  (Charlie Layne, Mislav Abha, Tatum Paolo, Anjali Wanda, Quinn Elton). Pick one
  to become that user. Escape or clicking outside closes the menu.
- **Details:** there is no real authentication. The client tells
  `/api/liveblocks-auth` which user it wants to be and gets a session for that
  user. The choice is saved in `localStorage` and restored on the next visit.
  Switching users remounts the whole Liveblocks connection, so presence, feeds,
  and activity all reload for the new identity. The AI teammate cannot be
  selected; it never logs in.
- **Gallery:** when the app is embedded on liveblocks.io, the
  `?examplePreview=N` query parameter picks the user by index so side-by-side
  panes are logged in as different people.

## Files

- `features/users/user-menu.tsx`
- `features/users/api/liveblocks-auth.ts`
- `lib/database.ts`
- `features/users/api/users.ts`
- `features/users/api/users-search.ts`
- Tests: `tests/`
