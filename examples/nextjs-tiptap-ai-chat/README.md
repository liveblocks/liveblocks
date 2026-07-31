<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Tiptap editor with an AI chat

<p>
  <a href="https://liveblocks.io/examples/tiptap-ai-chat/nextjs-tiptap-ai-chat">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-tiptap-ai-chat">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a collaborative
[Tiptap](https://tiptap.dev/) text editor with an AI chat that edits the
document, using [Liveblocks](https://liveblocks.io) and
[Next.js](https://nextjs.org/).

The editor uses
[`@liveblocks/react-tiptap`](https://liveblocks.io/docs/api-reference/liveblocks-react-tiptap)
with `collaborationMode: "liveblocks"`, which stores the document in Liveblocks
Storage (as `LiveObject`/`LiveText` trees) instead of a Yjs document. That is
what lets the AI edit it from the server: the chat (built on
[Liveblocks Feeds](https://liveblocks.io/docs/collaboration-features/ai-collaboration)
and [AI Elements](https://ai-sdk.dev/elements)) calls a route that applies the
model's edits with `mutateStorage`, so AI changes merge character-by-character
with whatever users are typing at the same time.

Before every AI edit, the route snapshots the room with
`createVersionHistorySnapshot`. A Google Docs-style version history panel lists
the versions (`useHistoryVersions` + `useHistoryVersionStorageData`) and can
restore any of them, and each AI reply in the chat has a "Revert" action for
the edit it made. The editor also includes a toolbar, a floating toolbar,
drag-handle block reordering, and comment threads.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/tiptap-ai-chat.png" width="536" alt="Tiptap AI Chat" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-tiptap-ai-chat --api-key
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
- _(Optional)_ Add an `AI_GATEWAY_API_KEY` from the
  [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) to get real model
  responses. Without it, the example uses a built-in mock assistant that still
  makes a real (revertible) document edit, so everything runs end to end.
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see the realtime sync, open the page in two browser tabs, type in the
document in one tab while asking the AI to rewrite a paragraph in the other —
both changes merge live.

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-tiptap-ai-chat --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-tiptap-ai-chat)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets).

</details>
