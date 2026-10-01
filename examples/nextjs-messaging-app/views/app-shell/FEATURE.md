# App shell

## Layout

The app is a single page (`/`) made of four regions, left to right:

| Region           | Width                      | Contents                                                                                            |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| **Rail**         | 72px                       | Workspace switcher (top), Home / DMs / Activity tabs with unread badges, user switcher (bottom)     |
| **Sidebar**      | 280px (200–480, draggable) | Depends on the active rail tab: channel + DM lists, the detailed DM list, or the Activity panel     |
| **Conversation** | flexible                   | Header (channel name or DM user, members, help button), message list, composer                      |
| **Thread panel** | 380px (300–640, draggable) | Opens to the right of the conversation when a thread is open; a full-width overlay on small screens |

The rail and the page background take the workspace's sidebar colour; the
sidebar and conversation sit on a white card.

## Resizable panels

- Drag the vertical handle on the sidebar's right edge or the thread panel's
  left edge (desktop only for the thread panel) to resize between each region's
  min and max width.
- The handle is a focusable separator: arrow keys nudge width by 16px, Home sets
  minimum, End sets maximum; double-click resets to the default width.
- Widths persist in localStorage (`liveblocks-messaging-app:sidebar-width`,
  `liveblocks-messaging-app:thread-panel-width`) and are clamped on reload if
  out of range.

## Default selection and fallbacks

- On first load of a workspace the first channel (`#general` by default) is
  opened.
- If the selected channel is deleted, or the selected DM user no longer exists,
  the app falls back to the first channel.
- If every channel has been deleted the conversation area shows "Create a
  channel to start messaging".

## Files

- `views/app-shell/app-shell.tsx`
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- Tests: `tests/`
