<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative support inbox

<p>
  <a href="https://liveblocks.io/examples/support-inbox-resend/nextjs-support-inbox-resend">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-support-inbox-resend">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/resend-message?style=flat&logo=resend&color=333&logoColor=fff" alt="Resend" />
</p>

This example shows how to build a shared customer-support inbox with
[Liveblocks Feeds](https://liveblocks.io/docs/products/sync/feeds),
[Resend Inboxes](https://resend.com/docs/dashboard/inboxes/introduction), and
[Next.js](https://nextjs.org/). Customer emails arrive in realtime, and agents
reply, leave internal notes with @-mentions, assign, prioritize, and tag
conversations together, seeing who else is viewing or typing.

Without a Resend inbox the app runs in demo mode with sample conversations and
simulated replies.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-support-inbox-resend --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

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

To see realtime sync, open the page in two browser tabs. Replies, internal notes,
assignments, priority, and status stay in sync across both tabs,
and live avatars show who is viewing each conversation.

</details>

### Setting up Resend

Optional. Without these steps the app runs in demo mode: sample conversations
are seeded and replies are simulated (clearly labelled) rather than emailed.
Connecting Resend turns the Support workspace into a real inbox; the Sales
workspace always runs on sample data.

- Create an account on [Resend](https://resend.com)
- **API key** — create one in the [Resend dashboard](https://resend.com/api-keys)
  with sending and inbox access, and add it to `.env.local` as
  `RESEND_API_KEY`. The app uses it to send replies through the Inboxes reply
  API and to verify webhooks.
- **Inbox** — create an inbox under [Inboxes](https://resend.com/inboxes). It
  can use Resend's hosted address or an address on your own verified domain
  (needed for replies to reach external mail providers). Add its id (`inb_…`)
  to `.env.local` as `RESEND_INBOX_ID`, or its address as
  `RESEND_INBOX_EMAIL`. Emails sent to this address become conversations.
- **Webhook** — under [Webhooks](https://resend.com/webhooks), add an endpoint
  pointing at `https://<your-host>/api/webhooks/resend` and subscribe it to
  `inbox.email.received` and `inbox.email.sent`. Copy its signing secret to
  `.env.local` as `RESEND_WEBHOOK_SECRET`. The first event creates or updates
  the conversation; the second confirms a reply was sent.
- Restart `npm run dev`. The Settings view in the sidebar shows whether the
  inbox is connected and which webhook URL to use.

Resend has to reach the webhook over the internet, so for local development
expose port 3000 with a tunnel such as [ngrok](https://ngrok.com)
(`ngrok http 3000`) and use that URL for the endpoint. Only emails received
after the webhook is set up appear; there is no backfill.

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-support-inbox-resend --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-support-inbox-resend)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets). To send and receive real email,
follow [Setting up Resend](#setting-up-resend) and add those variables too.

</details>
