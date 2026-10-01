# Feature map

This is the index of user-facing behaviour in the Messaging App example. Each
feature and view documents its own behaviour in its folder's `FEATURE.md`.
`AGENTS.md` covers code layout and import rules.

## Features

| Feature         | Docs                                                                       | One-line summary                                               |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| users           | [features/users/FEATURE.md](features/users/FEATURE.md)                     | Fake login and user switcher for five demo users               |
| workspaces      | [features/workspaces/FEATURE.md](features/workspaces/FEATURE.md)           | Switch Acme and Initech workspaces with sidebar theming        |
| channels        | [features/channels/FEATURE.md](features/channels/FEATURE.md)               | Channel CRUD, reorder, members, intros synced in Storage       |
| direct-messages | [features/direct-messages/FEATURE.md](features/direct-messages/FEATURE.md) | Compact and detailed DM lists and lazy feed ids                |
| composer        | [features/composer/FEATURE.md](features/composer/FEATURE.md)               | Tiptap composer, @mentions, and presence typing indicators     |
| messages        | [features/messages/FEATURE.md](features/messages/FEATURE.md)               | Rendering, grouping, scrolling, reactions, delete, persistence |
| threads         | [features/threads/FEATURE.md](features/threads/FEATURE.md)                 | Thread panel, replies, pills, and AI thread behaviour          |
| ai              | [features/ai/FEATURE.md](features/ai/FEATURE.md)                           | Liveblocks AI DMs, mentions, streaming via the AI Gateway      |
| activity        | [features/activity/FEATURE.md](features/activity/FEATURE.md)               | Activity feed, panel, jump-to, read state, and badges          |
| help            | [features/help/FEATURE.md](features/help/FEATURE.md)                       | Help modal with example feature cards                          |

## Views

| View         | Docs                                                           | One-line summary                                     |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------------- |
| app-shell    | [views/app-shell/FEATURE.md](views/app-shell/FEATURE.md)       | Four-region layout and default selection fallbacks   |
| rail         | [views/rail/FEATURE.md](views/rail/FEATURE.md)                 | Home, DMs, Activity tabs with unread badges          |
| sidebar      | [views/sidebar/FEATURE.md](views/sidebar/FEATURE.md)           | Resizable column; content depends on active rail tab |
| conversation | [views/conversation/FEATURE.md](views/conversation/FEATURE.md) | Header, message list, composer, lazy feed creation   |

## Presence

- **Online dots** on avatars in the DM lists, DM header, members popover, and
  mention suggestions reflect who currently has the same workspace open. Open
  the app in a second tab as another user to see them turn green.
- **Typing indicators** are also presence-driven (see
  `features/composer/FEATURE.md`).
- The AI is always shown online.

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
- `AI_GATEWAY_API_KEY` — required for AI replies; `/api/ai-reply` returns `403`
  without it.
- `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL` — optional; points the client and server at
  a self-hosted dev server (used by the e2e tests).

## Shared code

| What                               | Files                                     |
| ---------------------------------- | ----------------------------------------- |
| Avatars and presence dots          | `primitives/avatar.tsx`                   |
| Feed ids, message types and guards | `lib/feeds.ts`                            |
| Mention tokens                     | `lib/mentions.ts`                         |
| Navigation types (selection, tabs) | `lib/navigation.ts`                       |
| Panel widths (resize, persistence) | `lib/panel-width.ts`                      |
| `Channel` type                     | `lib/channels.ts`                         |
| Gallery integration                | `lib/example.ts`, `lib/example.client.ts` |
| Liveblocks types                   | `liveblocks.config.ts`                    |
| API routes (re-exports only)       | `app/api/**/route.ts`                     |
