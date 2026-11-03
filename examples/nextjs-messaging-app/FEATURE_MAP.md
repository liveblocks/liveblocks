# Feature map

This is the index of user-facing behaviour in the Messaging App example. Each
feature and view documents its own behaviour in its folder's `FEATURE.md`.
`AGENTS.md` covers code layout and import rules.

## Features

| Feature         | Docs                                                                       | One-line summary                                               |
| --------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| users           | [features/users/FEATURE.md](features/users/FEATURE.md)                     | Better Auth sign-in, account menu (status, away, sign out)     |
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
  the app in a second tab as another user to see them turn green. Users marked
  away stay connected but show a gray dot and "Away" where labels are shown.
- **Status** (emoji and short text, plus away) lives in Presence, is persisted
  per user in localStorage (`lib/status.ts`), and is edited from the rail
  account menu (`features/users/FEATURE.md`). Surfaces that show names also show
  the status emoji when set (`lib/presence.ts`, `primitives/status-emoji.tsx`).
- **Typing indicators** are also presence-driven (see
  `features/composer/FEATURE.md`).
- The AI is always shown online.

## Under the hood

### Liveblocks primitives

| Primitive    | Used for                                                                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Room**     | One per workspace: `liveblocks:examples:nextjs-messaging-app:<workspaceId>` (plus `-<exampleId>` in the gallery)                                                                             |
| **Storage**  | `channels: LiveList<LiveObject<{ id, name }>>` — the ordered channel list                                                                                                                    |
| **Presence** | `{ typingIn: string \| null, status?: { emoji, text, away } }` — typing target, optional status; also powers online/away dots and labels                                                     |
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
| `/api/auth/*`              | \*     | Better Auth (stateless, no database): `sign-in/demo`, `get-session`, `sign-out`, …                                                       |
| `/api/liveblocks-auth`     | POST   | Issues a Liveblocks token for the user in the Better Auth cookie (or `previewUserId` in gallery preview mode); `401` without a session   |
| `/api/users?userIds=…`     | GET    | Resolves user ids to name/avatar/colour (`resolveUsers`)                                                                                 |
| `/api/users/search?text=…` | GET    | Searches users by name or id (`resolveMentionSuggestions`; the composer also filters a local list client-side)                           |
| `/api/ai-reply`            | POST   | Creates a streaming AI message in the given feed, updates it as text arrives, and (for threads) bumps metadata and notifies participants |

### Environment variables

- `LIVEBLOCKS_SECRET_KEY` — required.
- `BETTER_AUTH_SECRET` — required in production (Better Auth refuses to start
  with its default secret there); optional in development. Signs and encrypts
  the session cookie. Generate one with `openssl rand -base64 32`.
- `BETTER_AUTH_URL` — optional; the public origin of the app. Without it Better
  Auth derives it from each request, which is fine for this example.
- `AI_GATEWAY_API_KEY` — required for AI replies; `/api/ai-reply` returns `403`
  without it.
- `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL` — optional; points the client and server at
  a self-hosted dev server (used by the e2e tests).
