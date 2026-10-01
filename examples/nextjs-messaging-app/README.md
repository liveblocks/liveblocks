<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Messaging App

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-messaging-app">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/messaging-app.png" width="536" alt="Messaging App" />

This example shows how to build a Slack-like messaging app with
[Liveblocks Feeds](https://liveblocks.io/docs/collaboration-features/ai-collaboration),
[Storage](https://liveblocks.io/docs/api-reference/liveblocks-react#Storage),
[Presence](https://liveblocks.io/docs/api-reference/liveblocks-react#Presence),
and [Next.js](https://nextjs.org/) — no database needed, Liveblocks stores
everything. Each workspace is a Liveblocks room: the channel list lives in
Storage (create, rename, delete, and drag-and-drop to reorder channels), and
each channel's messages live in a feed. Direct messages are feeds too, with an
id derived from the two participants, so no lookup table is needed. Messages
support basic rich text and @-mentions via a [Tiptap](https://tiptap.dev/)
composer, and mentioning the AI teammate streams a reply into a thread by
updating a feed message with
[`@liveblocks/node`](https://liveblocks.io/docs/api-reference/liveblocks-node)
and the [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). DM the AI
directly and it replies inline. Each user also has a personal activity feed:
DMs, @mentions, and replies in threads they're part of are written there as
references to the original message and stamped as read once seen, which powers
the Activity view and the unread badges in the sidebar. The login is fake: pick
any demo user from the dropdown, and your last choice is remembered in
`localStorage`.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-messaging-app --api-key
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
- Optionally, add an `AI_GATEWAY_API_KEY` from the
  [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to get real AI replies
  when you mention the AI teammate (a mock reply is streamed otherwise)
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see realtime sync, open the page in two browser tabs and pick two different
users. Messages, direct messages, typing indicators, and channel edits sync
across both tabs.

</details>

### Running the tests

<details><summary>Read more</summary>

<p></p>

The code is organised by feature (`features/`, `views/`, `primitives/`, `lib/`;
see `AGENTS.md`), and each feature folder carries its own tests in `tests/`:

- `*.test.ts(x)` — vitest: pure helpers, API route handlers with
  `@liveblocks/node` mocked, and React components rendered against an in-memory
  mock of `@liveblocks/react` (`tests/helpers/liveblocks-mock.tsx`)
- `*.spec.ts` — Playwright flows against the real app, backed by the local
  Liveblocks dev server (multi-user: mentions, DMs, threads, badges, presence)

```bash
npm run check                         # typecheck + eslint + structure + prettier + vitest
npm test                              # vitest only
npm run dev:local                     # run the app on :3100 against a local Liveblocks dev server, no keys
npx vitest run features/channels      # one feature
npx playwright install chromium       # once
npm run test:e2e                      # e2e against a local Liveblocks dev server
npm run test:e2e:cloud                # e2e against the keys in .env.local
```

The e2e suite starts its own `next dev` on port 3111 (build output in
`.next-e2e`, so it can run alongside your regular dev server). The AI tests in
`features/ai/tests/ai.spec.ts` need the real Liveblocks backend and are skipped
on the local dev server; run them with `npm run test:e2e:cloud`.

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-messaging-app --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-messaging-app)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets). Add `AI_GATEWAY_API_KEY` if you
want real AI replies instead of the mock ones.

</details>
