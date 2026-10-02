# Conversation

The main column: a header (channel name or DM user, members popover, help
button), the message list and the composer. Opening a conversation creates its
feed if needed. Behaviour of the header for DMs is described in
`features/direct-messages/FEATURE.md`; the message list and composer in
`features/messages/FEATURE.md` and `features/composer/FEATURE.md`. For human DMs
the header shows away state and the other person's status emoji and text when
set (`lib/presence.ts`, `primitives/status-emoji.tsx`).

## Files

- `views/conversation/conversation.tsx`
- Tests: `tests/`
