# Feature map

A tour of every user-facing feature in the Messaging App example: what it does,
how to use it, and where to find it in the UI. The last section maps each
feature to the files that implement it.

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

---

## Identity and workspaces

### Fake login / user switcher

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

### Workspace switcher

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

---

## Navigation

### Rail tabs: Home, DMs, Activity

- **Where:** the three icon buttons below the workspace switcher.
- **How:** click a tab to change what the sidebar shows. The active tab is
  highlighted and marked `aria-current="page"`.
  - **Home** — the workspace name as a header, then a **Channels** section and a
    compact **Direct messages** section.
  - **DMs** — a "Direct messages" header and the detailed DM list with latest
    message previews.
  - **Activity** — the Activity panel (notifications).
- **Unread badges:** each tab carries a red count badge (capped at "99+"):
  - Home counts unread **@mentions in channels** (including mentions inside
    channel threads).
  - DMs counts **everything unread in a DM** (new DMs, thread replies and
    mentions inside DM threads).
  - Activity counts **all** unread items.

### Default selection and fallbacks

- On first load of a workspace the first channel (`#general` by default) is
  opened.
- If the selected channel is deleted, or the selected DM user no longer exists,
  the app falls back to the first channel.
- If every channel has been deleted the conversation area shows "Create a
  channel to start messaging".

---

## Channels

Channels live in the room's Storage as an ordered list. Every change below syncs
to everyone in the workspace in realtime.

### Default channels

- A fresh workspace starts with `#general`, `#random`, `#engineering`,
  `#design`, and `#marketing`.

### Open a channel

- **Where:** Home tab → Channels list.
- **How:** click a channel row. The active channel is drawn dark. Rows with
  unread mentions are bold and show a red badge with the mention count.

### Create a channel

- **Where:** "Add channel" button under the channel list (Home tab).
- **How:** click it to reveal an inline text field with the placeholder
  `channel-name`. Type a name and press **Enter** to create and open the new
  channel. **Escape** cancels; clicking away with an empty field also cancels.
  Whitespace-only names are ignored.

### Rename a channel

- **Where:** pencil icon that appears when hovering a channel row.
- **How:** click the pencil; the name becomes an inline input prefilled with the
  current name. **Enter** or clicking away saves; **Escape** cancels. Empty
  names are ignored. Drag-to-reorder is disabled while renaming so text
  selection works.

### Delete a channel

- **Where:** trash icon that appears when hovering a channel row.
- **How:** click it. There is no confirmation. The channel's message feed and
  every thread feed attached to it are deleted, then the channel is removed from
  the list. If it was the open channel, the app falls back to the first
  remaining channel.

### Reorder channels (drag and drop)

- **Where:** Home tab → Channels list.
- **How:** press on any channel row and drag it up or down; the whole row is the
  drag handle. A 5px movement threshold keeps ordinary clicks working. The new
  order is written to Storage and syncs live.

### Channel members

- **Where:** the people icon with a count in the conversation header (channels
  only).
- **How:** click it to open a popover listing all demo users plus the AI
  teammate. Each row shows an avatar, the name, "(you)" for yourself, an
  **Agent** badge for the AI, and an Online/Offline dot. Online status comes
  from room presence, so a user is online when they have the same workspace open
  in another tab or browser. The AI is always shown online.

### Channel intro

- **Where:** top of the message list, once the full history has loaded.
- **What:** a "Welcome to #channel" card explaining this is the beginning of the
  channel and suggesting you @mention the AI.

---

## Direct messages

### DM list (compact)

- **Where:** Home tab → Direct messages section under the channels.
- **What:** one row per other demo user, plus **Liveblocks AI** with an
  **Agent** badge. Each row has a small avatar with a green/grey presence dot,
  the name, and a red unread badge when there is unread activity in that
  conversation. Click a row to open the DM.

### DM list (detailed)

- **Where:** DMs tab.
- **What:** the same people, laid out like the Activity panel: large avatar with
  presence dot, name (and Agent badge), time of the latest message, a
  brand-coloured unread badge, and a two-line preview of the latest message.
  Your own latest message is prefixed with "You: ". Conversations that have
  never been opened show "No messages yet". Previews stay live, so streaming AI
  replies, edits, and deletions update in place.

### DM conversation header

- **Where:** top of the conversation when a DM is open.
- **What:** the other person's avatar with a presence dot, their name, and an
  "Online"/"Offline" label (or the **Agent** badge for the AI).

### DM intro

- **Where:** top of the message list when the full history has loaded.
- **What:** a card with the person's avatar and a note that this is the start of
  your direct message history. For the AI it instead says "Ask anything, and it
  will reply right here."

### How DMs are stored

- A DM is a feed whose id is derived from the two participants' ids (sorted), so
  both sides compute the same id and no lookup table is needed. The feed is
  created lazily the first time either participant opens the conversation.
- DMs are hidden from other users in the UI. (In this demo the auth endpoint
  grants write access to all example rooms, so this is a UI boundary, not an
  access-control one.)

---

## Messaging

### Composer

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

### @mentions

- **Where:** inside any composer.
- **How:** type `@` to open a suggestion popup listing the five demo users and
  the AI teammate, each with an avatar, Online/Offline status, and the Agent
  badge where relevant. Keep typing to filter by name. Use **↑/↓** to move,
  **Enter** or click to insert, **Escape** to dismiss. While the popup is open,
  Enter picks a suggestion instead of sending.
- **Details:** mentions are stored as `<@userId>` tokens in the markdown and
  rendered as brand-coloured chips. Mentioning a human adds an item to their
  Activity (see **Activity and notifications**). Mentioning the AI triggers a
  reply (see **AI teammate**). You are never notified about your own mentions.

### Message rendering

Messages render a small markdown subset:

- **bold**, _italic_ (`*` or `_`), ~~strikethrough~~, `inline code`
- fenced code blocks (dark block)
- `[label](url)` links and bare URLs, both drawn as link chips with a link icon
  and a shortened label (scheme and `www.` stripped, long URLs truncated in the
  middle). Links open in a new tab.
- `<@userId>` mentions as chips with the user's name
- YouTube links (`watch?v=`, `youtu.be`, `shorts`, `embed`) additionally embed
  the video under the message, up to two per message.

### Message grouping and day dividers

- Consecutive messages from the same author within five minutes are grouped:
  only the first shows the avatar, name, and time.
- A "Today" / "Yesterday" / weekday-and-date divider is inserted whenever the
  day changes. Thread panels show no dividers.

### Scrolling behaviour

- The list is bottom-anchored like Slack: history grows upward from the composer
  and the view stays pinned to the newest message while you are within ~80px of
  the bottom. Scroll up and it stops following.
- Jumping to a message from Activity scrolls it into the centre and takes
  priority over sticking to the bottom.
- While a conversation's messages are still loading, a flexible spacer stands in
  for the list so the composer stays pinned to the bottom instead of jumping up
  under the header.

### Hover toolbar on a message

Hover any message to reveal a small toolbar at the top right:

| Button              | Shown when                                                  | What it does                                                    |
| ------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| **Add reaction**    | message is not still streaming                              | Opens the emoji picker                                          |
| **Reply in thread** | in a channel or human DM (not in the AI DM, not in threads) | Opens the thread panel for this message                         |
| **Delete message**  | you wrote the message                                       | Deletes it (and its thread, if it has one) with no confirmation |

### Reactions

- **Where:** "Add reaction" in the hover toolbar, or the `+` chip at the end of
  an existing reaction row.
- **How:** a searchable emoji picker opens above the message. Pick an emoji to
  add your reaction. Reactions appear as chips under the message showing the
  emoji and a count; chips you have reacted with are highlighted. Click a chip
  to toggle your reaction on or off. Hover a chip for a tooltip listing who
  reacted and when. Reactions are hidden while an AI message is streaming.

### Delete a message

- **Where:** trash icon in the hover toolbar on your own messages.
- **Details:** deleting a channel or DM message that has a thread also deletes
  the thread. Deleting a thread reply updates the reply count and participants;
  deleting the last reply removes the thread and closes the panel. Activity
  items pointing at a deleted message are removed from recipients' Activity
  automatically once the feed has fully loaded. The parent message cannot be
  deleted from inside the thread panel; delete it from the conversation instead.

### Typing indicators

- **Where:** the line under the composer.
- **What:** "X is typing…", "X and Y are typing…", or "Several people are
  typing…" for others typing in the same channel, DM, or thread. Typing state is
  broadcast through Presence and cleared 2.5 seconds after the last keystroke,
  on send, or when leaving the conversation.

### Persistence

- Messages, reactions, threads, and activity are stored in Liveblocks feeds and
  survive reloads. The channel list is stored in Liveblocks Storage.

---

## Threads

Threads are available in channels and human DMs. The AI DM has no threads; the
AI replies inline there.

### Open a thread

- **Where:** "Reply in thread" in a message's hover toolbar, or the reply pill
  under a message that already has replies. Threads also open automatically when
  you @mention the AI in a channel or when you jump to a thread item from
  Activity.
- **What:** the thread panel slides in on the right with a "Thread" header and a
  close (×) button. It shows the parent message, a "N replies" divider (or "No
  replies yet. Start the thread below."), the replies, and a `Reply…` composer.

### Reply in a thread

- **How:** use the composer at the bottom of the panel. Everything from the main
  composer (rich text, mentions, typing indicator) works here.
- **Details:** replies are stored in a separate feed attached to the parent
  message. The thread's reply count and participant list are kept in the feed
  metadata. Replying notifies the other participants (everyone who has posted in
  or been mentioned in the thread) with a "replied in a thread" item; anyone you
  newly @mention gets a "mentioned you in a thread" item instead.

### Reply pill

- **Where:** under a channel/DM message that has at least one reply.
- **What:** up to five participant avatars, "N replies", and "Last reply at
  <time>". Click it to open the thread.

### Close a thread

- **How:** click × in the panel header, or select a different conversation. The
  panel also closes itself if the parent message is deleted.

### Threads and the AI

- If the parent message @mentions the AI, every reply in that thread gets an AI
  reply. In other threads, the AI only replies when a reply @mentions it.

---

## AI teammate

**Liveblocks AI** appears alongside the human users in DM lists, mention
suggestions, and the members popover, always marked with an **Agent** badge and
always shown online. It posts through `@liveblocks/node` from the
`/api/ai-reply` route and never logs in.

### Mention the AI in a channel or human DM

- **How:** send a message containing `@Liveblocks AI`.
- **What happens:** a thread is created on your message and opened immediately.
  The AI's reply streams into that thread, not into the channel. Other thread
  participants receive a "replied in a thread" activity item pointing at the
  streaming reply, so their Activity fills in as the reply lands.

### DM the AI

- **How:** open **Liveblocks AI** from either DM list and send any message. No
  mention is needed.
- **What happens:** the AI replies inline in the DM, using the last 24 messages
  of the conversation as context.

### Streaming

- A reply starts as an empty message showing a spinner and "Thinking…", then
  fills in as text streams. While streaming, the message has no reaction or
  delete controls. Previews in the DMs tab and Activity update live.

### Real vs. mock replies

- With an `AI_GATEWAY_API_KEY` environment variable set, replies come from
  `openai/gpt-5.4-mini` via the Vercel AI Gateway, with a short system prompt
  that lists the known users so the model can @mention them.
- Without the key, a mock reply is streamed word by word explaining that the key
  is missing and echoing what you said.
- If generation fails, the message is finalised with an error note.

---

## Activity and notifications

Every user has a personal activity feed per workspace. Items are references to a
real message somewhere else, stamped with a `readAt` timestamp once seen. Unread
items drive every badge in the app; read items stay as history.

### What creates an activity item

| Event                                                            | Recipient(s)                                                      | Item type      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------- | -------------- |
| Someone sends you a DM                                           | you                                                               | `dm`           |
| Someone @mentions you in a channel message                       | you                                                               | `mention`      |
| Someone @mentions you in a thread reply                          | you                                                               | `mention`      |
| Someone replies in a thread you have posted in or been tagged in | every other participant (not those newly mentioned in that reply) | `thread_reply` |
| The AI replies in a thread                                       | every human participant                                           | `thread_reply` |

You are never notified about your own messages, and the AI never receives
activity.

### Activity panel

- **Where:** Activity tab in the rail.
- **What:** newest-first rows, each with the sender's avatar, a title such as
  "Charlie Layne mentioned you in #general", "… mentioned you in a thread in
  #design", "… replied in a thread in your conversation", or "… sent you a
  direct message", the time, and a two-line preview of the referenced message.
  Unread rows are bold on a tinted background with a dot indicator; read rows
  are muted. If the channel has since been deleted the location reads "a deleted
  channel". When there is nothing yet, the panel explains what will show up
  here.
- **Load older activity:** a button at the bottom pages further back through the
  feed.
- Previews are loaded live from the referenced message's feed. If the message is
  further back than a few pages, the row says "Message is further back in the
  history"; if it has been deleted, the item is removed.

### Jump to a message

- **How:** click an activity row.
- **What happens:** the app switches to the conversation the item belongs to,
  opens the thread if the message is a thread reply, scrolls the message into
  the centre of the view, and highlights it with a yellow background. The
  clicked row is marked active. If the message is not loaded yet, the list pages
  back through history (up to four extra pages) to find it.

### Marking items read

- **Automatically:** opening a conversation marks all top-level items for that
  conversation read. Items for a thread are marked read once that thread panel
  is open.
- **One item:** hover an unread row and click the check icon ("Mark as read").
- **All items:** click the double-check icon in the Activity header ("Mark all
  as read"). The button only appears when something is unread.
- Marking read clears badges but keeps the item in the list as history.

### Where unread counts appear

| Surface                    | Counts                                                 | Colour |
| -------------------------- | ------------------------------------------------------ | ------ |
| Rail → Home                | unread mentions rooted in channels                     | red    |
| Rail → DMs                 | all unread items rooted in a DM                        | red    |
| Rail → Activity            | all unread items                                       | red    |
| Channel row (Home)         | unread mentions in that channel, including its threads | red    |
| DM row (Home, compact)     | all unread items in that DM, including its threads     | red    |
| DM row (DMs tab, detailed) | same as above                                          | brand  |
| Activity row               | dot while unread                                       | brand  |

Plain thread replies in a channel never badge the channel row or the Home tab;
they only show in Activity.

---

## Presence

- **Online dots** on avatars in the DM lists, DM header, members popover, and
  mention suggestions reflect who currently has the same workspace open. Open
  the app in a second tab as another user to see them turn green.
- **Typing indicators** are also presence-driven (see **Messaging**).
- The AI is always shown online.

---

## Help

### Help button

- **Where:** the `?` icon in the conversation header.
- **What:** opens a modal titled "Messaging App — How to use this example" with
  four feature cards (channels in Storage, the AI teammate, multi-user sync,
  rich text and mentions). The title links to the example's page on
  liveblocks.io. Close with ×, Escape, or by clicking the backdrop.

---

## Under the hood

### Liveblocks primitives

| Primitive    | Used for                                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Room**     | One per workspace: `liveblocks:examples:nextjs-messaging-app:<workspaceId>` (plus `-<exampleId>` in the gallery)                                                                             |
| **Storage**  | `channels: LiveList<LiveObject<{ id, name }>>` — the ordered channel list                                                                                                                    |
| **Presence** | `{ typingIn: string \| null }` — the feed id the user is typing in; also powers online status                                                                                                |
| **Feeds**    | Channel messages (feed id = channel id), DMs (`dm_<a>__<b>`), thread replies (`thread_<parentMessageId>`), and per-user activity (`activity_<userId>`), all distinguished by `metadata.type` |

Feed message shapes (`liveblocks.config.ts`):

- Chat messages: `{ userId, content, streaming?, reactions? }` — `content` is
  markdown with `<@userId>` mention tokens.
- Activity items:
  `{ kind: "activity", type, fromUserId, feedId, messageId, parentFeedId?, parentMessageId?, readAt? }`.

Thread feed metadata carries `channelId`, `parentMessageId`, `replyCount` (as a
string), and `participantIds`.

### API routes

| Route                      | Method | Purpose                                                                                                                                  |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/liveblocks-auth`     | POST   | Fake login: issues a session for the requested demo user with write access to `liveblocks:examples:*`                                    |
| `/api/users?userIds=…`     | GET    | Resolves user ids to name/avatar/colour (`resolveUsers`)                                                                                 |
| `/api/users/search?text=…` | GET    | Searches users by name or id (`resolveMentionSuggestions`; the composer also filters a local list client-side)                           |
| `/api/ai-reply`            | POST   | Creates a streaming AI message in the given feed, updates it as text arrives, and (for threads) bumps metadata and notifies participants |

### Environment variables

- `LIVEBLOCKS_SECRET_KEY` — required.
- `AI_GATEWAY_API_KEY` — optional; enables real model replies.
- `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL` — optional; points the client and server at
  a self-hosted dev server (used by the e2e tests).

---

## Feature → file index

Code is organised by feature (see `AGENTS.md` for the layout and import rules).
Each feature and view folder has an `index.ts` listing its public surface and a
`tests/` folder with its vitest (`*.test.*`) and Playwright (`*.spec.ts`)
suites.

| Feature                                   | Files                                                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| App shell, selection, fallbacks, theming  | `views/app-shell/app-shell.tsx`, `app/page.tsx`, `app/layout.tsx`, `app/globals.css`                                         |
| User switcher / fake login                | `features/users/user-menu.tsx`, `features/users/api/liveblocks-auth.ts`, `lib/database.ts`                                   |
| User resolution and mention search routes | `features/users/api/users.ts`, `features/users/api/users-search.ts`                                                          |
| Workspace switcher and themes             | `features/workspaces/workspace-switcher.tsx`, `features/workspaces/workspaces.ts`                                            |
| Rail tabs and badges                      | `views/rail/rail.tsx`, `primitives/unread-badge.tsx`                                                                         |
| Sidebar layout                            | `views/sidebar/sidebar.tsx`, `primitives/column-header.tsx`                                                                  |
| Channels (CRUD, reorder, badges)          | `features/channels/channel-list.tsx`, `features/channels/channels.ts`                                                        |
| Channel members popover                   | `features/channels/channel-members.tsx`                                                                                      |
| DM lists                                  | `features/direct-messages/direct-message-list.tsx`, `primitives/preview-row.tsx`                                             |
| Conversation header, feed creation        | `views/conversation/conversation.tsx`                                                                                        |
| Message list, scrolling, intros           | `features/messages/message-list.tsx`                                                                                         |
| Message, reactions, thread pill           | `features/messages/message.tsx`, `features/messages/emoji-picker-popover.tsx`                                                |
| Message grouping and day dividers         | `features/messages/message-items.ts`, `lib/time.ts`                                                                          |
| Markdown rendering                        | `primitives/markdown.tsx`                                                                                                    |
| Composer, mentions, typing                | `features/composer/composer.tsx`, `composer.css`, `mention-suggestions.tsx`, `typing-indicator.tsx`, `serialize-markdown.ts` |
| Threads                                   | `features/threads/thread-panel.tsx`, `lib/threads.ts`                                                                        |
| AI replies                                | `features/ai/api/ai-reply.ts`, `features/ai/request-ai-reply.ts`                                                             |
| Activity model and hooks                  | `features/activity/activity.ts`, `features/activity/use-activity.ts`                                                         |
| Activity panel                            | `features/activity/activity-panel.tsx`, `primitives/preview-row.tsx`                                                         |
| Avatars and presence dots                 | `primitives/avatar.tsx`                                                                                                      |
| Help modal                                | `features/help/help-button.tsx`                                                                                              |
| Feed ids, message types and guards        | `lib/feeds.ts`                                                                                                               |
| Mention tokens                            | `lib/mentions.ts`                                                                                                            |
| Navigation types (selection, tabs)        | `lib/navigation.ts`                                                                                                          |
| `Channel` type                            | `lib/channels.ts`                                                                                                            |
| Gallery integration                       | `lib/example.ts`, `lib/example.client.ts`                                                                                    |
| Liveblocks types                          | `liveblocks.config.ts`                                                                                                       |
| API routes (re-exports only)              | `app/api/**/route.ts`                                                                                                        |
