# App shell

## Layout

The app is a single page (`/`) made of four regions, left to right:

| Region           | Width    | Contents                                                                                            |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------- |
| **Rail**         | 72px     | Workspace switcher (top), Home / DMs / Activity tabs with unread badges, user switcher (bottom)     |
| **Sidebar**      | 280px    | Depends on the active rail tab: channel + DM lists, the detailed DM list, or the Activity panel     |
| **Conversation** | flexible | Header (channel name or DM user, members, help button), message list, composer                      |
| **Thread panel** | 380px    | Opens to the right of the conversation when a thread is open; a full-width overlay on small screens |

The rail and the page background take the workspace's sidebar colour; the
sidebar and conversation sit on a white card.

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
