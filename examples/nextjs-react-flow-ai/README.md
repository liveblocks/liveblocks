<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative React Flow with AI

<p>
  <a href="https://liveblocks.io/examples/react-flow/nextjs-react-flow-ai/preview">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-react-flow-ai">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/React%20Flow-message?style=flat&color=7bf" alt="React Flow" />
</p>

This example shows how to build a collaborative flowchart with an AI agent,
powered by [Liveblocks](https://liveblocks.io),
[React Flow](https://reactflow.dev/), [Next.js](https://nextjs.org/), the
[Vercel AI SDK](https://sdk.vercel.ai/), and [OpenAI](https://openai.com).

You can place blocks, connect them, edit labels, undo and redo, and ask the AI
to edit the diagram in real time for everyone in the room.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-react-flow-ai --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

### Setting up OpenAI

You need your own OpenAI API key to run the AI agent.

- Create an account on [OpenAI](https://openai.com)
- Create a new API key from the
  [OpenAI Dashboard](https://platform.openai.com/api-keys)
- Add your OpenAI API key to `.env.local` as the `OPENAI_API_KEY` environment
  variable

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Copy `.env.example` to `.env.local` and set `LIVEBLOCKS_SECRET_KEY`
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)
- Follow the “Setting up OpenAI” section above.

</details>

### Dev server setup

<details><summary>Read more</summary>

<p></p>

You can optionally run this example locally using the
[Liveblocks dev server](https://liveblocks.io/docs/tools/dev-server).

- Install the example as detailed above
- Run `npx liveblocks dev` to start the server
- Replace the secret in `new Liveblocks` with `"sk_localdev"`
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-react-flow-ai --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

Next, follow the “Setting up OpenAI” section above.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-react-flow-ai)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` and `OPENAI_API_KEY`
environment variables as [secrets](https://codesandbox.io/docs/secrets).

Next, follow the “Setting up OpenAI” section above.

</details>
