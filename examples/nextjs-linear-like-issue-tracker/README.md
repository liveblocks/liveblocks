<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Linear-like Issue Tracker

<p>
  <a href="https://liveblocks.io/examples/linear-like-issue-tracker/nextjs-linear-like-issue-tracker/preview">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" /> 
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-linear-like-issue-tracker">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a Linear-inspired collaborative issue tracker
using [Liveblocks](https://liveblocks.io), and [Next.js](https://nextjs.org/).
Users can create issues with a rich-text editor, giving them priorities,
progress state, and labels. Comments can be left on issues and users receive
notifications if they've been mentioned.

You can optionally enable an **AI assistant**: when it is configured, `@AI Assistant` appears in mentions; tagging it in a comment starts a streamed reply. The assistant receives the **full user list** in its system prompt. It can **create issues** in one step with optional **description** (markdown), **labels**, **links**, **progress**, **priority**, and **assignee**; **append/replace the current issue description** from markdown ([`withLexicalDocument`](https://liveblocks.io/docs/api-reference/liveblocks-node-lexical)); **append links** to the current issue’s Links list ([`mutateStorage`](https://liveblocks.io/docs/api-reference/liveblocks-node)); **update issue properties** on the current issue (title, progress, priority, assignee, labels via `mutateStorage`); and your **presence** stays on for the whole run so others see the AI in the room while tools run. Without webhook setup, the example runs as before and the AI is hidden from mention suggestions.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/linear-like-issue-tracker.png" width="536" alt="Issue tracker" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-linear-like-issue-tracker --api-key
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

### AI assistant (optional)

<details><summary>Read more</summary>

<p></p>

- Add `ANTHROPIC_API_KEY` to `.env.local` (same provider as the [comments AI example](https://github.com/liveblocks/liveblocks/tree/main/examples/nextjs-comments-ai)).
- In the [Liveblocks dashboard](https://liveblocks.io/dashboard), open **Webhooks**, create a webhook pointing to your deployed URL **`/api/ai-comment-reply`** (or use a tunnel such as [ngrok](http://ngrok.com/) for local development), and subscribe to **`commentCreated`** events.
- Set the webhook signing secret as **`LIVEBLOCKS_WEBHOOK_SECRET_KEY`** in `.env.local`. When this variable is unset, the AI user is omitted from mention search and the webhook route returns “not configured”.
- For **local + ngrok**, `next.config.ts` already allows **`*.ngrok-free.app`** and **`*.ngrok.io`**. Restart **`npm run dev`** after changing `next.config.ts`. For other tunnels, set **`NEXT_DEV_ALLOWED_ORIGINS`** (comma-separated hostnames) in `.env.local`.

</details>

### Dev server setup

<details><summary>Read more</summary>

<p></p>

You can optionally run this example locally using the
[Liveblocks dev server](https://liveblocks.io/docs/tools/dev-server).

- Install the example as detailed above
- Run `npx liveblocks dev` to start the server
- Add `baseUrl: "http://localhost:1153"` option to `LiveblocksProvider` and
  `new Liveblocks`
- Replace `secret` in `new Liveblocks` with `"sk_localdev"`
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-linear-like-issue-tracker --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-linear-like-issue-tracker)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets).

</details>
