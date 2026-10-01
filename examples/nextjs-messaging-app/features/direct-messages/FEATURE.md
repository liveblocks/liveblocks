# Direct messages

## DM list (compact)

- **Where:** Home tab → Direct messages section under the channels.
- **What:** one row per other demo user, plus **Liveblocks AI** with an
  **Agent** badge. Each row has a small avatar with a green/grey presence dot,
  the name, and a red unread badge when there is unread activity in that
  conversation. Click a row to open the DM.

## DM list (detailed)

- **Where:** DMs tab.
- **What:** the same people, laid out like the Activity panel: large avatar with
  presence dot, name (and Agent badge), time of the latest message, a
  brand-coloured unread badge, and a two-line preview of the latest message.
  Your own latest message is prefixed with "You: ". Conversations that have
  never been opened show "No messages yet". Previews stay live, so streaming AI
  replies, edits, and deletions update in place.

## DM conversation header

- **Where:** top of the conversation when a DM is open.
- **What:** the other person's avatar with a presence dot, their name, and an
  "Online"/"Offline" label (or the **Agent** badge for the AI).

## DM intro

- **Where:** top of the message list when the full history has loaded.
- **What:** a card with the person's avatar and a note that this is the start of
  your direct message history. For the AI it instead says "Ask anything, and it
  will reply right here."

## How DMs are stored

- A DM is a feed whose id is derived from the two participants' ids (sorted), so
  both sides compute the same id and no lookup table is needed. The feed is
  created lazily the first time either participant opens the conversation.
- DMs are hidden from other users in the UI. (In this demo the auth endpoint
  grants write access to all example rooms, so this is a UI boundary, not an
  access-control one.)

## Files

- `features/direct-messages/direct-message-list.tsx`
- `primitives/preview-row.tsx`
- Tests: `tests/`
