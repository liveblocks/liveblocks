# Messages

## Message rendering

Messages render a small markdown subset:

- **bold**, _italic_ (`*` or `_`), ~~strikethrough~~, `inline code`
- fenced code blocks (dark block)
- `[label](url)` links and bare URLs, both drawn as link chips with a link icon
  and a shortened label (scheme and `www.` stripped, long URLs truncated in the
  middle). Links open in a new tab.
- `<@userId>` mentions as chips with the user's name
- YouTube links (`watch?v=`, `youtu.be`, `shorts`, `embed`) additionally embed
  the video under the message, up to two per message.

## Message grouping and day dividers

- Consecutive messages from the same author within five minutes are grouped:
  only the first shows the avatar, name, and time.
- A "Today" / "Yesterday" / weekday-and-date divider is inserted whenever the
  day changes. Thread panels show no dividers.

## Scrolling behaviour

- The list is bottom-anchored like Slack: history grows upward from the composer
  and the view stays pinned to the newest message while you are within ~80px of
  the bottom. Scroll up and it stops following.
- Jumping to a message from Activity scrolls it into the centre and takes
  priority over sticking to the bottom.
- While a conversation's messages are still loading, a flexible spacer stands in
  for the list so the composer stays pinned to the bottom instead of jumping up
  under the header.

## Hover toolbar on a message

Hover any message to reveal a small toolbar at the top right:

| Button              | Shown when                                                  | What it does                                                    |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| **Add reaction**    | message is not still streaming                              | Opens the emoji picker                                          |
| **Reply in thread** | in a channel or human DM (not in the AI DM, not in threads) | Opens the thread panel for this message                         |
| **Delete message**  | you wrote the message                                       | Deletes it (and its thread, if it has one) with no confirmation |

## Reactions

- **Where:** "Add reaction" in the hover toolbar, or the `+` chip at the end of
  an existing reaction row.
- **How:** a searchable emoji picker opens above the message. Pick an emoji to
  add your reaction. Reactions appear as chips under the message showing the
  emoji and a count; chips you have reacted with are highlighted. Click a chip
  to toggle your reaction on or off. Hover a chip for a tooltip listing who
  reacted and when. Reactions are hidden while an AI message is streaming.

## Delete a message

- **Where:** trash icon in the hover toolbar on your own messages.
- **Details:** deleting a channel or DM message that has a thread also deletes
  the thread. Deleting a thread reply updates the reply count and participants;
  deleting the last reply removes the thread and closes the panel. Activity
  items pointing at a deleted message are removed from recipients' Activity
  automatically once the feed has fully loaded. The parent message cannot be
  deleted from inside the thread panel; delete it from the conversation instead.

## Persistence

- Messages, reactions, threads, and activity are stored in Liveblocks feeds and
  survive reloads. The channel list is stored in Liveblocks Storage.

## Files

- `features/messages/message-list.tsx`
- `features/messages/message.tsx`
- `features/messages/emoji-picker-popover.tsx`
- `features/messages/message-items.ts`
- `lib/time.ts`
- `primitives/markdown.tsx`
- Tests: `tests/`
