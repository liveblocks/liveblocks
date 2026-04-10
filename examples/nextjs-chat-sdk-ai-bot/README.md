<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# AI bot (Chat SDK + Liveblocks Comments)

<p>
  <a href="https://liveblocks.io/docs/examples/liveblocks-chat-sdk">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/liveblocks-chat-sdk-ai-bot">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example is a **Next.js** app with **Liveblocks Comments** (`Thread`,
`Composer`) in a room. The server runs the **[Chat SDK](https://chat-sdk.dev)**
with:

- [`@liveblocks/chat-sdk-adapter`](https://liveblocks.io/docs/api-reference/liveblocks-chat-sdk-adapter)
  — Liveblocks **platform adapter** (comments and threads mapped to Chat SDK
  channels)
- [`@chat-adapter/state-memory`](https://www.npmjs.com/package/@chat-adapter/state-memory)
  — Chat SDK **state** adapter (in-memory)
- [`ai`](https://sdk.vercel.ai/docs) and
  [`@ai-sdk/anthropic`](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic)
  — streaming replies from **Claude** into the thread

### What the bot does

When someone **@-mentions** the bot in a comment thread, the webhook handler
(`POST /api/webhooks/liveblocks`) runs [`bot.onNewMention`](app/bot.ts): it adds
a **👀** reaction to the message, calls **`streamText`** with Claude
(`claude-sonnet-4-20250514` by default), and **`stream`s the model output into
the thread** as the bot's reply.

The bot **does not** handle comment reactions (there is no `onReaction`
handler). The system prompt in [`app/bot.ts`](app/bot.ts) explains Liveblocks
**CommentBody** limits so the model favors formatting that survives in comments.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/comments.png" width="536" alt="Threads and composer" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example liveblocks-chat-sdk-ai-bot --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

### Environment variables

Add these to `.env.local` (see manual setup below if you are not using the CLI):

| Variable                    | Purpose                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| `LIVEBLOCKS_SECRET_KEY`     | Liveblocks secret key (`sk_…`) for REST and auth                                  |
| `LIVEBLOCKS_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`)                                                |
| `ANTHROPIC_API_KEY`         | [Anthropic API key](https://docs.anthropic.com/en/api/getting-started) for Claude |

### Setting up webhooks

The Liveblocks adapter (`@liveblocks/chat`) needs your server to receive
Liveblocks webhooks at `POST /api/webhooks/liveblocks` (see
[`app/api/webhooks/liveblocks/route.ts`](app/api/webhooks/liveblocks/route.ts)).

- Follow our guide on
  [testing webhooks locally](https://liveblocks.io/docs/guides/how-to-test-webhooks-on-localhost).
  When creating the webhook endpoint, enable at least **commentCreated** (see
  [webhook events](https://liveblocks.io/docs/platform/webhooks#edit-endpoint-events)).
  That event is required so new mentions reach `bot.onNewMention`.
- **commentReactionAdded** and **commentReactionRemoved** are optional for this
  example; they are only needed if you add reaction handling (the non-AI
  [liveblocks-chat-sdk-bot](../liveblocks-chat-sdk-bot) example uses them).
- Copy your **webhook secret** (`whsec_…`) from the webhooks dashboard
- Add it to `.env.local` as `LIVEBLOCKS_WEBHOOK_SECRET`

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file with:
  - `LIVEBLOCKS_SECRET_KEY` — Liveblocks secret key
  - `LIVEBLOCKS_WEBHOOK_SECRET` — webhook signing secret (after you configure
    webhooks)
  - `ANTHROPIC_API_KEY` — from the
    [Anthropic Console](https://console.anthropic.com/)
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)
- Follow the “Setting up webhooks” section above

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example liveblocks-chat-sdk-ai-bot --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

Add **`ANTHROPIC_API_KEY`** (and the Liveblocks variables) in the Vercel project
settings. Then follow the “Setting up webhooks” section above using your
production webhook URL.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/liveblocks-chat-sdk-ai-bot)
on CodeSandbox, add **`LIVEBLOCKS_SECRET_KEY`**,
**`LIVEBLOCKS_WEBHOOK_SECRET`**, and **`ANTHROPIC_API_KEY`** as
[secrets](https://codesandbox.io/docs/secrets).

Webhook delivery to a sandbox URL may require a tunnel (see
[testing webhooks locally](https://liveblocks.io/docs/guides/how-to-test-webhooks-on-localhost)).

</details>
