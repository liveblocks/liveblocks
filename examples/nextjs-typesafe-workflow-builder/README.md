<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# TypeSafe workflow builder

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-typesafe-workflow-builder">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/React%20Flow-message?style=flat&color=7bf" alt="React Flow" />
  <img src="https://img.shields.io/badge/TypeSafe-message?style=flat&color=333" alt="TypeSafe" />
</p>

This example shows how to build a collaborative, n8n-style AI workflow builder
with [Liveblocks](https://liveblocks.io), [React Flow](https://reactflow.dev/),
[TypeSafe](https://typesafe.ai) (the Jev model), and
[Next.js](https://nextjs.org/). Each workflow is a Liveblocks room: nodes and
edges sync through [Storage](https://liveblocks.io/docs/products/sync) via
`@liveblocks/react-flow`, and every test run or REST-triggered run is written to
a [Feed](https://liveblocks.io/docs/products/sync/feeds) so all collaborators
watch it execute live.

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-typesafe-workflow-builder --api-key
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
- Copy `.env.example` to `.env.local` and set the following environment
  variables:
  - `LIVEBLOCKS_SECRET_KEY` (required)
  - `TYPESAFE_API_KEY` (optional, from https://console.typesafe.ai; without it
    Jev nodes use a keyword-matching mock)
  - `AI_GATEWAY_API_KEY` (optional, Vercel AI Gateway; without it LLM nodes
    stream a mock reply)
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

</details>

## How conditions work

Every answer a Jev node can give is a handle on its right edge: one per Choice
option, one per Score level, and `yes` / `no` for a yes-no question (with an
editable threshold). Connecting a handle to another node means "run that node
only when this answer fires".

- **IF this OR that**: connect several handles into one node and leave it on
  "any input fires" (the default).
- **IF this AND that**: connect several handles into one node and switch it to
  "all inputs fire". The node shows an `AND` badge at its input and only runs
  when every connected handle fired. The demo's "Escalation summary" node works
  this way: it needs `intent = billing` and `urgent = yes`.

## Triggering a workflow over REST

```bash
curl -X POST "http://localhost:3000/api/workflows/<workflowId>/runs?wait=true" \
  -H "Content-Type: application/json" \
  -d '{"input":"I was charged twice for order A-104. Please refund the duplicate."}'
```

The workflow id is the last segment of the workflow URL (`/w/<workflowId>`);
without `wait=true` the endpoint responds `202` with `{ runId }` immediately and
the run streams into the feed. With `wait=true` the JSON includes an `output`
object keyed by the properties configured on the output node. It starts with
`customer` and `team`; click Edit to add, rename, or remove any number of
properties. Each property has its own input connection. Renaming a property
keeps its connections, while removing it also removes its connections.

Each value is an array containing one text per parent that fired into that
input, or `[]` when none fired. A parent connected to several properties appears
in each of their arrays. With no properties, `output` is `{}`. To merge several
drafts into one string, connect them to an LLM node first. Connections and saved
runs from before named properties were added appear under `customer`.

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-typesafe-workflow-builder --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel. Optionally add `TYPESAFE_API_KEY` and
`AI_GATEWAY_API_KEY` as environment variables in your Vercel project for real
TypeSafe and LLM responses.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-typesafe-workflow-builder)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets). Add `TYPESAFE_API_KEY` and
`AI_GATEWAY_API_KEY` if you want real TypeSafe and LLM responses instead of the
mock implementations.

</details>
