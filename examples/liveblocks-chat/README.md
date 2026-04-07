# Liveblocks Chat (Slack + Comments + AI)

Next.js example that combines **[Liveblocks](https://liveblocks.io)** (collaborative **tables** and **Comments**) with the **[Chat SDK](https://chat-sdk.dev)**:

- [`@liveblocks/chat-sdk-adapter`](https://liveblocks.io/docs/api-reference/liveblocks-chat-sdk-adapter) — comment threads in rooms map to Chat SDK channels/threads.
- [`@chat-adapter/slack`](https://chat-sdk.dev/docs/adapters/slack) — the same bot can answer **@mentions in Slack**.
- [`@chat-adapter/state-memory`](https://chat-sdk.dev/docs/state) / [`@chat-adapter/state-redis`](https://chat-sdk.dev/docs/state/redis) — Chat SDK **state**: defaults to **in-memory** for local dev; set **`CHAT_STATE_ADAPTER=redis`** and **`REDIS_URL`** for production (multi-instance, durable sessions).
- [`ai`](https://sdk.vercel.ai/docs) + [`@ai-sdk/anthropic`](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic) — **Claude** powers replies and tools that create/edit Liveblocks documents.

The bot logic lives in [`app/bot.ts`](app/bot.ts). Webhooks are handled by `app/api/webhooks/[platform]/route.ts` (platforms: `liveblocks`, `slack`).

## What you get

- **Home** (`/`) — lists Liveblocks rooms whose IDs start with `doc-` (tables created by the bot).
- **Document** (`/[roomId]`) — editable table plus comment thread; @mention **Acme AI** (or your configured bot name) in the composer.
- **Slack** — @mention the bot in a channel; it can create documents and reply with links.

## Prerequisites

- **Node.js 22+** (matches the Liveblocks monorepo `engines` when you run from this repo).
- A [Liveblocks](https://liveblocks.io/dashboard) project with **Comments** enabled.
- An [Anthropic](https://console.anthropic.com/) API key.
- For Slack: a [Slack app](https://api.slack.com/apps) with event subscriptions pointing at this app (see below).

## Install and run

**From the Liveblocks monorepo** (this example is an npm workspace package):

```bash
cd liveblocks
npm install
cd examples/liveblocks-chat
npm run dev
```

**Standalone copy of this folder only:**

```bash
cd liveblocks-chat
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Create `.env.local` (or `.env`) in `liveblocks-chat`.

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `LIVEBLOCKS_SECRET_KEY` | Yes | Secret key (`sk_…`) from the [Liveblocks dashboard](https://liveblocks.io/dashboard/apikeys). Used for auth, REST, and the Liveblocks adapter. |
| `LIVEBLOCKS_WEBHOOK_SECRET_KEY` | Yes* | Webhook signing secret (`whsec_…`) from Liveblocks webhooks. Used to verify `POST /api/webhooks/liveblocks`. |
| `ANTHROPIC_API_KEY` | Yes | [Anthropic API key](https://docs.anthropic.com/en/api/getting-started) for Claude. |
| `CHAT_STATE_ADAPTER` | Optional | `memory` (default) or `redis`. Use **`redis`** in production with **`REDIS_URL`**. |
| `REDIS_URL` | If `redis` | Redis connection URL when `CHAT_STATE_ADAPTER=redis` ([Chat SDK Redis adapter](https://chat-sdk.dev/docs/state/redis)). Ignored when using `memory`. |
| `APP_URL` | Recommended | Public base URL of this app (e.g. `https://abc.ngrok-free.app`). Used for document links the bot posts. Defaults to `http://localhost:3000` if unset. |
| `SLACK_BOT_TOKEN` | For Slack | Bot token `xoxb-…` (**single-workspace** install). |
| `SLACK_SIGNING_SECRET` | For Slack | From Slack app **Basic Information → App Credentials**. |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | OAuth only | Multi-workspace installs; use with [`/api/slack/install/callback`](app/api/slack/install/callback/route.ts). Use **`CHAT_STATE_ADAPTER=redis`** (and `REDIS_URL`) so installs persist across restarts and instances. |
| `NEXT_PUBLIC_LIVEBLOCKS_BOT_USER_ID` or `LIVEBLOCKS_BOT_USER_ID` | Optional | Stable ID for the bot in comments/presence (default `bot`). |
| `LIVEBLOCKS_BOT_DISPLAY_NAME` | Optional | Display name (default **Acme AI**). |

\*Required if you use Liveblocks comment webhooks. Not needed if you only experiment without comment events (the bot will not see in-app @mentions without webhooks).

## Liveblocks webhooks

1. In the Liveblocks dashboard, add a webhook endpoint whose URL is your **public** origin plus **`/api/webhooks/liveblocks`**.
2. Enable at least **`commentCreated`** so new @mentions in comments reach the bot ([adapter events](https://github.com/liveblocks/liveblocks/blob/main/packages/liveblocks-chat-sdk-adapter/README.md#webhook-events)).
3. Copy the signing secret into **`LIVEBLOCKS_WEBHOOK_SECRET_KEY`**.

Local development: use a tunnel (ngrok, Cloudflare Tunnel, etc.) and follow [testing webhooks on localhost](https://liveblocks.io/docs/guides/how-to-test-webhooks-on-localhost).

## Slack app

1. Create a Slack app and set **Event Subscriptions** and **Interactivity** request URLs to:

   `https://<your-public-host>/api/webhooks/slack`

2. Subscribe to the bot events your flows need (see [Chat SDK Slack adapter](https://chat-sdk.dev/docs/adapters/slack#slack-app-setup); the sample manifest there is a good starting point).
3. **Single workspace:** install the app, copy the **Bot User OAuth Token** → `SLACK_BOT_TOKEN`, and set `SLACK_SIGNING_SECRET`.
4. Invite the bot to channels where you will @mention it.

Use the same public base URL for Slack as for Liveblocks if you tunnel both (and set **`APP_URL`** to that base URL so links in Slack are correct).

## Verify

- `GET /api/webhooks/liveblocks` — should respond that the Liveblocks webhook route is active (when the adapter is configured).
- `GET /api/webhooks/slack` — same for Slack when Slack env vars are set.
- In Slack: @mention the bot and ask for a small table (e.g. leads with columns name, company, email); open the document URL it returns.
- In the app: open a `doc-…` room and @mention **Acme AI** in the comment composer (requires Liveblocks webhooks delivering to your server).

## Production notes

- Set **`CHAT_STATE_ADAPTER=redis`** and **`REDIS_URL`** (e.g. [Upstash](https://upstash.com/) on Vercel) so Chat SDK state survives deploys and is shared across serverless instances.
- **`CHAT_STATE_ADAPTER=memory`** (the default) is fine for local development only.
- Set all secrets in your host’s environment (e.g. Vercel project settings).
- Webhook URLs must be **HTTPS** and publicly reachable.

## Learn more

- [Liveblocks Comments](https://liveblocks.io/docs/products/comments)
- [Chat SDK](https://chat-sdk.dev/docs)
- [Next.js documentation](https://nextjs.org/docs)
