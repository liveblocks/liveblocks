<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Chat SDK + Liveblocks adapter bot

<p>
  <a href="https://liveblocks.io/docs/examples/liveblocks-chat-sdk">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/liveblocks-chat-sdk-bot">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a bot on Liveblocks comment threads using the
[Chat SDK](https://chat-sdk.dev):
[`@liveblocks/chat-sdk-adapter`](https://liveblocks.io/docs/api-reference/liveblocks-chat-sdk-adapter)
is Liveblocks’ **platform adapter** for the Chat SDK, and
[`@chat-adapter/state-memory`](https://www.npmjs.com/package/@chat-adapter/state-memory)
provides the Chat SDK **state** adapter. The UI runs on
[Liveblocks](https://liveblocks.io) and [Next.js](https://nextjs.org/).

When someone @-mentions the bot in a thread, it replies in the thread; adding a
reaction to a message triggers a short reply as well.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/comments.png" width="536" alt="Threads and composer" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example liveblocks-chat-sdk-bot --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

### Setting up webhooks

The Liveblocks adapter (`@liveblocks/chat-sdk-adapter`) needs Liveblocks
webhooks to receive new comments and reactions.

- Follow our guide on
  [testing webhooks locally](https://liveblocks.io/docs/guides/how-to-test-webhooks-on-localhost).
  When creating the webhook endpoint, enable the **commentCreated**,
  **commentReactionAdded**, and **commentReactionRemoved** events (see
  [webhook events](https://liveblocks.io/docs/platform/webhooks#edit-endpoint-events))
- Copy your **webhook secret** (`whsec_…`) from the webhooks dashboard
- Add it to `.env.local` as the `LIVEBLOCKS_WEBHOOK_SECRET` environment variable

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **secret** key as the
  `LIVEBLOCKS_SECRET_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)
- Follow the “Setting up webhooks” section above

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example liveblocks-chat-sdk-bot --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

Next, follow the “Setting up webhooks” section above (use your production
webhook URL).

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/liveblocks-chat-sdk-bot)
on CodeSandbox, add the `LIVEBLOCKS_SECRET_KEY` and `LIVEBLOCKS_WEBHOOK_SECRET`
environment variables as [secrets](https://codesandbox.io/docs/secrets).

Webhook delivery to a sandbox URL may require a tunnel (see
[testing webhooks locally](https://liveblocks.io/docs/guides/how-to-test-webhooks-on-localhost)).

</details>
