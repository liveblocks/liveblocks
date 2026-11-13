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
</p>

This example shows how to build a shared customer-support inbox with
[Liveblocks Feeds](https://liveblocks.io/docs/products/sync/feeds) and
[Resend Inboxes](https://resend.com/docs/dashboard/inboxes/introduction), using
[Next.js](https://nextjs.org/). Each shared inbox (workspace) is a Liveblocks
room, each email conversation is a feed, and each email or internal note is a
feed message. Switch between the Support and Sales workspaces from the sidebar;
only the Support inbox can be connected to Resend, the Sales workspace always
runs on sample conversations.
Incoming emails arrive via a Resend Inboxes webhook; replies are sent through
the Resend Inboxes reply API and appear instantly for every agent (optimistic
"sending" state settled by the server). Live avatars show who is reading each
conversation (Presence). Internal notes with @-mentions, assignment, priority,
resolve/reopen, search and filters all sync in realtime.

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
- _(Optional)_ Add `RESEND_API_KEY`, `RESEND_INBOX_ID` (or the inbox email
  address), and `RESEND_WEBHOOK_SECRET` to connect a real Resend inbox. Without
  them, the app runs in demo mode: it seeds realistic sample conversations and
  replies are simulated (clearly labelled) and never emailed. With them, point a
  Resend webhook at `https://<your-domain>/api/webhooks/resend` subscribed to
  `inbox.email.received` and `inbox.email.sent`. For local development use a
  tunnel (e.g. `ngrok`) so Resend can reach the webhook route. See
  [`.env.example`](./.env.example) for variable names and comments.
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see realtime sync, open the page in two browser tabs. Replies, internal notes,
assignments, priority, and resolve/reopen state stay in sync across both tabs,
and live avatars show who is viewing each conversation.

</details>

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
[secret](https://codesandbox.io/docs/secrets). Add `RESEND_API_KEY`,
`RESEND_INBOX_ID`, and `RESEND_WEBHOOK_SECRET` if you want to send and receive
real email instead of demo mode.

</details>
