# @liveblocks/chat-sdk-adapter

[Chat SDK](https://chat-sdk.dev/docs) adapter backed by
[Liveblocks Comments](https://liveblocks.io/docs/products/comments). It maps
Liveblocks rooms, threads, and comments to the Chat SDK’s `Channel` / `Thread` /
`Message` model so you can build bots that read and post in comment threads.

## Installation

```bash
npm install @liveblocks/chat-sdk-adapter chat
```

See the [Chat SDK documentation](https://chat-sdk.dev/docs) for core concepts
and the
[Liveblocks API reference](https://liveblocks.io/docs/api-reference/liveblocks-chat-sdk-adapter)
for product-specific detail.

## Usage

Create the adapter, then pass it as `adapters.liveblocks` when constructing the
Chat SDK `Chat` instance. For a runnable bot (state, handlers, webhooks), see
[Full example](#full-example).

```typescript
import { createLiveblocksAdapter } from "@liveblocks/chat-sdk-adapter";

const adapter = createLiveblocksAdapter({
  apiKey: process.env.LIVEBLOCKS_SECRET_KEY!,
  webhookSecret: process.env.LIVEBLOCKS_WEBHOOK_SECRET!,
  botUserId: "my-bot-user",
  botUserName: "MyBot",
});
```

## Configuration

| Option              | Type       | Default                       | Description                                                                                                       |
| ------------------- | ---------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `apiKey`            | `string`   | —                             | Liveblocks secret key (`sk_...`) for REST API calls                                                               |
| `webhookSecret`     | `string`   | —                             | Webhook signing secret (`whsec_...`) from the dashboard                                                           |
| `botUserId`         | `string`   | —                             | User ID used when the bot creates, edits, or reacts to comments; must match your app’s user identifiers           |
| `botUserName`       | `string`   | `"liveblocks-bot"`            | Display name for the bot                                                                                          |
| `resolveUsers`      | `function` | —                             | Resolves user IDs for @mentions; return one entry per input id in order, or `undefined` to skip (see TSDoc types) |
| `resolveGroupsInfo` | `function` | —                             | Resolves group IDs for @mentions; same ordering rules as `resolveUsers`                                           |
| `logger`            | `Logger`   | `ConsoleLogger("info")` child | Chat SDK–compatible logger                                                                                        |

Resolver return types follow `@liveblocks/core` user and group metadata shapes
(`U["info"]`, `DGI`).

### Resolving mentions

When comments contain @mentions, provide `resolveUsers` and optional
`resolveGroupsInfo`:

```typescript
const adapter = createLiveblocksAdapter({
  apiKey: process.env.LIVEBLOCKS_SECRET_KEY!,
  webhookSecret: process.env.LIVEBLOCKS_WEBHOOK_SECRET!,
  botUserId: "my-bot-user",

  resolveUsers: async ({ userIds }) => {
    const users = await getUsersFromDatabase(userIds);
    return users.map((user) => ({
      name: user.fullName,
      avatar: user.avatarUrl,
    }));
  },

  resolveGroupsInfo: async ({ groupIds }) => {
    const groups = await getGroupsFromDatabase(groupIds);
    return groups.map((group) => ({ name: group.displayName }));
  },
});
```

## Platform setup

1. Create a [Liveblocks project](https://liveblocks.io/docs/get-started) with
   rooms using [Comments](https://liveblocks.io/docs/products/comments).
2. In the dashboard, copy a **secret key** (`sk_...`) for server-side REST API
   calls.
3. Create a **webhook signing secret** (`whsec_...`) and configure webhooks to
   subscribe to:
   - `commentCreated`
   - `commentReactionAdded`
   - `commentReactionRemoved`
4. Choose a stable `botUserId` consistent with how your app identifies users
   (the bot should be a real user ID in your system or a dedicated bot ID you
   issue).

Point your Liveblocks webhook URL at the route that forwards requests to
`bot.webhooks.liveblocks` (see [Webhook events](#webhook-events)).

## Webhook events

Supported Liveblocks webhook types:

| Event                    | Role                               |
| ------------------------ | ---------------------------------- |
| `commentCreated`         | Drives Chat SDK message processing |
| `commentReactionAdded`   | Drives reaction handlers           |
| `commentReactionRemoved` | Drives reaction handlers           |

```typescript
export async function POST(request: Request) {
  return bot.webhooks.liveblocks(request, {
    waitUntil: (p) => void p,
  });
}
```

The adapter verifies signatures with `webhookSecret`; invalid requests get
**401**.

> **Serverless:** Passing `waitUntil` (e.g. on Vercel) lets work continue after
> the response is sent.

## ID encoding

- **Thread ID:** `liveblocks:{roomId}:{threadId}`
- **Channel ID:** `liveblocks:{roomId}`

### `encodeThreadId`

```typescript
adapter.encodeThreadId(data: { roomId: string; threadId: string }): string;
```

```typescript
const encoded = adapter.encodeThreadId({
  roomId: "my-room",
  threadId: "th_abc123",
});
// "liveblocks:my-room:th_abc123"
```

### `decodeThreadId`

```typescript
adapter.decodeThreadId(threadId: string): { roomId: string; threadId: string };
```

Throws if the format is invalid. Room IDs may contain `:`; the **last** `:`
separates `threadId`, so Liveblocks thread IDs must not contain `:`.

## Features

| Area               | Support                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Threads / channels | Maps rooms and comment threads to Chat SDK models                                                                                                                        |
| Post, edit, delete | Comments via REST                                                                                                                                                        |
| Reactions          | Unicode emoji only; names like `thumbs_up` normalize to emoji where supported; unknown custom ids can fail API validation — e.g. `addReaction(…, "👍")` or `"thumbs_up"` |
| Mentions           | Users and groups when resolvers are provided                                                                                                                             |
| Attachments        | Fetched via Liveblocks attachment URLs                                                                                                                                   |
| Typing indicators  | Not supported — `startTyping` is a no-op                                                                                                                                 |

### Message format

Liveblocks Comments use a simpler body model than full Markdown. Outbound
content from the Chat SDK is converted automatically; some structure is
flattened.

**Supported:** paragraphs with bold, italic, code, strikethrough, links,
@mentions (users and groups).

**Flattened to plain text / paragraphs:** headings, bullet and numbered lists,
code blocks, tables (ASCII in a paragraph), raw HTML. Card payloads become
markdown/plain text (or `fallbackText`); interactivity is not preserved.

## Full example

```typescript
import { Chat } from "chat";
import {
  createLiveblocksAdapter,
  type LiveblocksAdapter,
} from "@liveblocks/chat-sdk-adapter";
import { createMemoryState } from "@chat-adapter/state-memory";

const bot = new Chat<{ liveblocks: LiveblocksAdapter }>({
  userName: "MyBot",
  adapters: {
    liveblocks: createLiveblocksAdapter({
      apiKey: process.env.LIVEBLOCKS_SECRET_KEY!,
      webhookSecret: process.env.LIVEBLOCKS_WEBHOOK_SECRET!,
      botUserId: "my-bot-user",
      botUserName: "MyBot",
      resolveUsers: async ({ userIds }) => {
        const users = await getUsersFromDatabase(userIds);
        return users.map((user) => ({ name: user.fullName }));
      },
    }),
  },
  state: createMemoryState(),
});

bot.onNewMention(async (thread, message) => {
  await thread.adapter.addReaction(thread.id, message.id, "👀");
  await thread.post(`Hello, ${message.author.userName}!`);
});

bot.onReaction(async (event) => {
  if (!event.added) return;
  await event.adapter.postMessage(
    event.threadId,
    `${event.user.userName} reacted with "${event.emoji.name}"`
  );
});
```

Wire Liveblocks to the same webhook handler as in
[Webhook events](#webhook-events) (for example a Next.js `POST` route that calls
`bot.webhooks.liveblocks`).

## Examples using Chat SDK

- **[Chat SDK Bot](https://liveblocks.io/examples/chat-sdk-bot/nextjs-chat-sdk-bot)**
  — Next.js bot that responds to @mentions and reactions in Liveblocks comment
  threads
  ([source](https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-chat-sdk-bot)).
- **[Chat SDK AI Bot](https://liveblocks.io/examples/chat-sdk-ai-bot/nextjs-chat-sdk-ai-bot)**
  — Same stack with an AI-powered reply flow
  ([source](https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-chat-sdk-ai-bot)).

Full walkthrough:
[Get started with a Chat SDK bot using Liveblocks and Next.js](https://liveblocks.io/docs/get-started/nextjs-chat-sdk-bot).

More collaborative examples:
[liveblocks.io/examples](https://liveblocks.io/examples).

## License

Apache License 2.0. See [LICENSE](../../licenses/LICENSE-APACHE-2.0).
