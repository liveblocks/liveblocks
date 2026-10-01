# Composer

## Composer

- **Where:** bottom of the conversation and bottom of the thread panel.
- **How:**
  - Type and press **Enter** to send. **Shift+Enter** inserts a line break.
  - The send button (arrow icon, bottom right of the box) is disabled while the
    message is empty.
  - Placeholder reads `Message #channel`, `Message <name>`, or `Reply…`.
  - The composer is focused automatically when you switch conversations.
  - A line under the composer shows who else is typing (see below).
- **Rich text:** the composer is a Tiptap editor. Markdown shortcuts are
  converted as you type: `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, and
  ` ` ``` for a code block. Headings, lists, blockquotes, and horizontal rules
  are disabled. Messages are serialised to markdown for storage.

## @mentions

- **Where:** inside any composer.
- **How:** type `@` to open a suggestion popup listing the five demo users and
  the AI teammate, each with an avatar, Online/Offline status, and the Agent
  badge where relevant. Keep typing to filter by name. Use **↑/↓** to move,
  **Enter** or click to insert, **Escape** to dismiss. While the popup is open,
  Enter picks a suggestion instead of sending.
- **Details:** mentions are stored as `<@userId>` tokens in the markdown and
  rendered as brand-coloured chips. Mentioning a human adds an item to their
  Activity (see `features/activity/FEATURE.md`). Mentioning the AI triggers a
  reply (see `features/ai/FEATURE.md`). You are never notified about your own
  mentions.

## Typing indicators

- **Where:** the line under the composer.
- **What:** "X is typing…", "X and Y are typing…", or "Several people are
  typing…" for others typing in the same channel, DM, or thread. Typing state is
  broadcast through Presence and cleared 2.5 seconds after the last keystroke,
  on send, or when leaving the conversation.

## Files

- `features/composer/composer.tsx`
- `features/composer/composer.css`
- `features/composer/mention-suggestions.tsx`
- `features/composer/typing-indicator.tsx`
- `features/composer/serialize-markdown.ts`
- Tests: `tests/`
