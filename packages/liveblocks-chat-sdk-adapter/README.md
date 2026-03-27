<p>
  <a href="https://liveblocks.io#gh-light-mode-only"><img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" /></a>
  <a href="https://liveblocks.io#gh-dark-mode-only"><img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" /></a>
</p>

# `@liveblocks/chat`

<p>
  <a href="https://npmjs.org/package/@liveblocks/chat"><img src="https://img.shields.io/npm/v/@liveblocks/chat?style=flat&label=npm&color=c33" alt="NPM" /></a>
  <a href="https://bundlephobia.com/package/@liveblocks/chat"><img src="https://img.shields.io/bundlephobia/minzip/@liveblocks/chat?style=flat&label=size&color=09f" alt="Size" /></a>
  <a href="https://github.com/liveblocks/liveblocks/blob/main/licenses/LICENSE-APACHE-2.0"><img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License" /></a>
</p>

`@liveblocks/chat` is a [Chat SDK](https://chat-sdk.dev) platform adapter backed
by [Liveblocks](https://liveblocks.io) **Comments**. It maps Liveblocks rooms,
threads, and comments to the Chat SDK’s shared `Channel` / `Thread` / `Message`
model so you can build conversational bots that read and post in Liveblocks
comment threads.

## Installation

```bash
npm install @liveblocks/chat chat
```

## Prerequisites

1. **Liveblocks project** — A [project](https://liveblocks.io/docs/get-started)
   and rooms where your app uses **Comments** (threads you want the bot to read
   and post in).

2. **Dashboard secrets** — Copy from the Liveblocks dashboard: a **secret key**
   (`sk_...`, passed as `apiKey`) for REST, and a **webhook signing secret**
   (`whsec_...`) so the adapter can verify webhook payloads.

3. **Webhooks** — Register a public **HTTPS** URL in the dashboard and subscribe
   to **`commentCreated`**, **`commentReactionAdded`**, and
   **`commentReactionRemoved`**. That route must forward the raw request to the
   Chat SDK (see Quick start); the adapter processes new comments and reactions
   after a valid event.

4. **Bot user** — Choose a stable `botUserId` (and optional `botUserName`) that
   matches how you identify users in your app; create/edit/reaction REST calls
   run as that user.

5. **Chat SDK `state`** — `new Chat({ … })` still needs a **state** adapter
   (Redis, Postgres, in-memory, etc.); this package only bridges Liveblocks.

## Quick start

```typescript
import { Chat } from "chat";
import { createLiveblocksAdapter } from "@liveblocks/chat";
// Plus a Chat SDK state adapter: https://chat-sdk.dev/docs/state

const liveblocks = createLiveblocksAdapter({
  apiKey: process.env.LIVEBLOCKS_SECRET_KEY!, // sk_...
  webhookSecret: process.env.LIVEBLOCKS_WEBHOOK_SECRET!, // whsec_...
  botUserId: "my-bot-user-id",
  botUserName: "MyBot",
});

const bot = new Chat({
  userName: "MyBot",
  adapters: { liveblocks },
  state: yourStateAdapter,
});

// Point Liveblocks webhooks at your route, then forward to the Chat SDK:
export async function POST(request: Request) {
  // Use your runtime's waitUntil for background processing (e.g. Vercel waitUntil)
  return bot.webhooks.liveblocks(request, {
    waitUntil: (p) => void p,
  });
}
```

## Configuration (`LiveblocksAdapterConfig`)

| Option              | Type                | Description                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`            | `string`            | Liveblocks secret key (`sk_...`) for server-side REST API calls.                                                                                                                                                                                                                                                                 |
| `webhookSecret`     | `string`            | Webhook signing secret (`whsec_...`) from the dashboard.                                                                                                                                                                                                                                                                         |
| `botUserId`         | `string`            | User id used when the bot creates, edits, or reacts to comments via the REST API.                                                                                                                                                                                                                                                |
| `botUserName`       | `string` (optional) | Display name for the bot (default: `"liveblocks-bot"`).                                                                                                                                                                                                                                                                          |
| `resolveUsers`      | function (optional) | When a comment mentions users, Liveblocks gives you their ids. Your function receives `{ userIds: string[] }` and returns an **array of user info in the same order** (same index as each id)—or `undefined` to skip. Use it to turn mention ids into display names in bot-facing message text. Omit it to fall back to raw ids. |
| `resolveGroupsInfo` | function (optional) | Same pattern for **group** mentions: receives `{ groupIds: string[] }`, return parallel arrays of group info (e.g. name) or `undefined`.                                                                                                                                                                                         |
| `logger`            | `Logger` (optional) | Chat SDK–compatible logger; defaults to `ConsoleLogger("info")` with a `liveblocks` child prefix.                                                                                                                                                                                                                                |

## Notes

- **Typing indicators** — Liveblocks Comments does not expose typing indicators;
  so the `startTyping` method on the adapter is a no-op.
- **Comment body shape when posting** — Liveblocks only models **paragraphs**
  with inline text (bold, italic, code, strikethrough), **links**, and
  **mentions**—not block headings, lists, fenced code, tables, or HTML. Chat SDK
  / markdown from the bot is **flattened** into that shape (e.g. headings and
  fences → paragraphs; tables → ASCII in a paragraph; HTML → plain runs).
- **Cards / structured messages** — Card payloads are turned into markdown/plain
  text (or `fallbackText`) then into a comment body; interactivity is not
  preserved.

Optional resolvers follow the same idea as Comments
[`resolveUsers`](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientResolveUsers)
/
[`resolveGroupsInfo`](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientResolveGroupsInfo)
on the client: you receive batches of ids and return matching metadata arrays.

## Documentation & examples

- [Liveblocks docs](https://liveblocks.io/docs) — Comments, REST API, webhooks.
- [Chat SDK](https://chat-sdk.dev) — Adapters, state, webhooks.
- [Collaborative examples](https://liveblocks.io/examples) — Open source in this
  repo under
  [`examples`](https://github.com/liveblocks/liveblocks/tree/main/examples).

## Community

- [Discord](https://liveblocks.io/discord) — Ask questions and share tips.
- [X](https://x.com/liveblocks) — Updates and announcements.

## License

Licensed under the Apache License 2.0, Copyright © 2021-present
[Liveblocks](https://liveblocks.io).

See [LICENSE](../../licenses/LICENSE-APACHE-2.0) for more information.
