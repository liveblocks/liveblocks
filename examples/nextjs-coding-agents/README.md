<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Coding Agents

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-coding-agents">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a multiplayer coding-agent chat, in the style of
Cursor agents or Codex, with
[Liveblocks Feeds](https://liveblocks.io/docs/products/sync/feeds),
[Notifications](https://liveblocks.io/docs/products/notifications),
[Presence](https://liveblocks.io/docs/api-reference/liveblocks-react#Presence),
the [Cursor SDK](https://cursor.com/docs/sdk/typescript), and
[Next.js](https://nextjs.org/). Everything lives in a single Liveblocks room:
each chat is a feed, and each feed is backed by a durable Cursor cloud agent
that reads the repository, runs commands, and opens pull requests.

Several people can talk to the same agent at once. A message posted while the
agent is busy is shown as queued; when the current run finishes, the queued
messages are sent as a follow-up run on the same agent, and the whole burst is
presented as one reply that only completes once everyone has been handled. The
agent's tool calls and text are streamed into the feed message from a
[Vercel Workflow](https://workflow.dev/) with
[`@liveblocks/node`](https://liveblocks.io/docs/api-reference/liveblocks-node),
so every client sees the run live. When a run completes, everyone who took part
in the chat gets an inbox notification. The composer is built with
[Tiptap](https://tiptap.dev/): type `@` to mention teammates and `/` to pick a
pre-baked skill (`lib/skills.ts`), and choose the model per chat from the
dropdown. The login is fake: pick any demo user from the dropdown, and your last
choice is remembered in `localStorage`.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-coding-agents --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

You also need a Cursor API key, see [manual setup](#manual-setup) below.

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
- Create a Cursor API key in the
  [Cursor dashboard](https://cursor.com/dashboard) under **API Keys** and add it
  as `CURSOR_API_KEY`. Cloud agent runs are billed to this key at API pricing.
- In the Cursor dashboard, connect GitHub under **Integrations** and grant the
  Cursor GitHub App access to the repository the agent works on. Without it,
  runs fail with `Failed to verify existence of branch …`, even when the branch
  exists.
- Optionally, set `CURSOR_MODEL` to change the default model for new chats
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

By default every chat works on the demo repository configured in `lib/repo.ts`.
Set `REPO_LOCKED` to `false` there to let people enter any GitHub repository
when they start a chat.

To see the multiplayer behavior, open the page in two browser tabs and pick two
different users. Start a task in one tab, then post a follow-up from the other
while the agent is working: it shows up as queued and is handled right after the
current task, in the same reply.

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-coding-agents --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel. Add `CURSOR_API_KEY` to the project's environment
variables as well.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-coding-agents)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` and `CURSOR_API_KEY`
environment variables as [secrets](https://codesandbox.io/docs/secrets).

</details>
