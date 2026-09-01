<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# AG Studio Dashboard

<p>
  <a href="https://liveblocks.io/examples/ag-studio-dashboard/nextjs-ag-studio">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-ag-studio">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
  <img src="https://img.shields.io/badge/typescript-message?style=flat&logo=typescript&color=007ACC&logoColor=fff" alt="TypeScript" />
</p>

This example shows how to build a collaborative analytics dashboard with
[AG Studio](https://www.ag-grid.com/studio/),
[Liveblocks Storage](https://liveblocks.io/docs/products/storage), and
[Next.js](https://nextjs.org/). Liveblocks Storage syncs the dashboard state
(widgets, layout, filters) per-widget in realtime, so multiple people can build
a dashboard together. Presence avatars show who is currently in the room.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/ag-studio.png" width="536" alt="AG Studio Dashboard" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-ag-studio --api-key
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
- Optionally add `NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY` to remove the AG Studio
  watermark on deployed (non-localhost) environments. AG Studio runs
  watermark-free on localhost without a licence key.
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see realtime sync, open the page in two browser tabs. Widget changes, layout
updates, and filter edits sync across both tabs.

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-ag-studio --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

When deploying, set `NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY` if you want to remove the
AG Studio watermark on your production domain.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-ag-studio)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets). Optionally add
`NEXT_PUBLIC_AG_STUDIO_LICENSE_KEY` to remove the AG Studio watermark on
non-localhost domains.

</details>
