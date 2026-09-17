<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Realtime AI spreadsheet

<p>
  <a href="https://liveblocks.io/examples/ai-spreadsheet/nextjs-ai-spreadsheet">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-ai-spreadsheet">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a realtime, multiplayer spreadsheet with an AI
that edits the grid, using
[Liveblocks](https://liveblocks.io),
[Handsontable](https://handsontable.com/),
[Next.js](https://nextjs.org/), and the [Vercel AI SDK](https://ai-sdk.dev/).

The grid is backed by Liveblocks Storage, so cells, formatting, column/row sizes,
and order all sync instantly to everyone — along with live selection presence and
per-cell comment threads. Everything is addressed by stable ids, so moving,
sorting, and inserting or deleting rows and columns never breaks comments,
formatting, or presence, and every user sees the same order. The AI lives in a
[Feeds](https://liveblocks.io/docs/products/sync/feeds)-based
chat: it edits the spreadsheet from the server with `@liveblocks/node`
(`mutateStorage`) and shows its live selection with `setPresence`, streaming both
its reply and the grid edits as it works.

### Jev reviewer

The sheet is also reviewed as you work, using
[Jev](https://docs.typesafe.ai), TypeSafe's System One model. Every time you
edit a cell or leave a comment, one Jev request asks ~20 typed yes/no questions
about the cell in context (typo? wrong number format? broken formula?
hardcoded total? outlier? …) and the conversation on it (unanswered question?
agreed value not entered? …), plus one question per check about whether the
thread already raises it. Jev returns calibrated probabilities; code keeps the
checks above `0.8` that aren't already open in the thread, and the LLM turns
those checks' prompts into a single comment on the cell with **Fix it** and
**Ignore** buttons. Nothing is changed automatically.

- **Fix it** posts a "Fix it" comment. Jev classifies it (`approve_fix`) and
  the AI applies exactly the recommended change with its tools, then confirms.
  Typing "yes, go ahead" by hand works the same way; an `@mention` skips Jev
  and replies directly.
- **Ignore** resolves the thread.
- Editing the cell so the issue goes away makes Jev's `thread_resolvable`
  check fire; the AI confirms and resolves the thread.

Jev routes, the LLM writes: see `lib/jev-review.ts` for the check catalog,
thresholds, and routing. The reviewer needs `TYPESAFE_API_KEY` and
`AI_GATEWAY_API_KEY`; comment triggers (including the Fix it button) also
need the `commentCreated` webhook below. Without them the reviewer is quietly
disabled.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-ai-spreadsheet --api-key
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
- Add an `AI_GATEWAY_API_KEY` from the
  [Vercel AI Gateway](https://vercel.com/docs/ai-gateway). This is required for
  the AI chat — it needs a real, tool-calling model to edit the spreadsheet.
- Optionally add a `TYPESAFE_API_KEY` from [TypeSafe](https://typesafe.ai) to
  enable the Jev reviewer, and point a `commentCreated`
  [webhook](https://liveblocks.io/dashboard/webhooks) at
  `/api/liveblocks-webhook` (setting `LIVEBLOCKS_WEBHOOK_SECRET_KEY`) so it
  can react to comments and the **Fix it** button. Locally, use a tunnel such
  as `localtunnel` or `ngrok` for the webhook URL.
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see the realtime sync, open the page in two browser tabs and edit a cell, drag
a row, or ask the AI to fill in some data — it appears instantly in both.

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-ai-spreadsheet --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-ai-spreadsheet)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets).

</details>
