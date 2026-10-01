# Channels

Channels live in the room's Storage as an ordered list. Every change below syncs
to everyone in the workspace in realtime.

## Default channels

- A fresh workspace starts with `#general`, `#random`, `#engineering`,
  `#design`, and `#marketing`.

## Open a channel

- **Where:** Home tab → Channels list.
- **How:** click a channel row. The active channel is drawn dark. Rows with
  unread mentions are bold and show a red badge with the mention count.

## Create a channel

- **Where:** "Add channel" button under the channel list (Home tab).
- **How:** click it to reveal an inline text field with the placeholder
  `channel-name`. Type a name and press **Enter** to create and open the new
  channel. **Escape** cancels; clicking away with an empty field also cancels.
  Whitespace-only names are ignored.

## Rename a channel

- **Where:** pencil icon that appears when hovering a channel row.
- **How:** click the pencil; the name becomes an inline input prefilled with the
  current name. **Enter** or clicking away saves; **Escape** cancels. Empty
  names are ignored. Drag-to-reorder is disabled while renaming so text
  selection works.

## Delete a channel

- **Where:** trash icon that appears when hovering a channel row.
- **How:** click it. There is no confirmation. The channel's message feed and
  every thread feed attached to it are deleted, then the channel is removed from
  the list. If it was the open channel, the app falls back to the first
  remaining channel.

## Reorder channels (drag and drop)

- **Where:** Home tab → Channels list.
- **How:** press on any channel row and drag it up or down; the whole row is the
  drag handle. A 5px movement threshold keeps ordinary clicks working. The new
  order is written to Storage and syncs live.

## Channel members

- **Where:** the people icon with a count in the conversation header (channels
  only).
- **How:** click it to open a popover listing all demo users plus the AI
  teammate. Each row shows an avatar, the name, "(you)" for yourself, an
  **Agent** badge for the AI, and an Online/Offline dot. Online status comes
  from room presence, so a user is online when they have the same workspace open
  in another tab or browser. The AI is always shown online.

## Channel intro

- **Where:** top of the message list, once the full history has loaded.
- **What:** a "Welcome to #channel" card explaining this is the beginning of the
  channel and suggesting you @mention the AI.

## Files

- `features/channels/channel-list.tsx`
- `features/channels/channels.ts`
- `features/channels/channel-members.tsx`
- Tests: `tests/`
