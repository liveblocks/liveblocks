# Workspaces

## Workspace switcher

- **Where:** lettered square button at the top of the rail.
- **How:** click it to open a "Switch workspace" list with **Acme** and
  **Initech**. Pick one to switch. Escape or clicking outside closes the menu.
- **Details:** each workspace is a separate Liveblocks room with its own channel
  list, messages, DMs, and activity. Switching workspaces also re-themes the app
  (Acme is purple with a blue accent, Initech is dark teal with a teal accent)
  by setting the `--sidebar` and `--brand` CSS variables. The last workspace is
  saved in `localStorage`.
- **Gallery:** `?exampleId=…` is appended to the room id so every gallery
  visitor gets isolated rooms.

## Files

- `features/workspaces/workspace-switcher.tsx`
- `features/workspaces/workspaces.ts`
- Tests: `tests/`
