<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Live Cursors

<p>
  <a href="https://liveblocks.io/examples/live-cursors/javascript/preview">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/javascript-live-cursors">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/javascript-message?style=flat&logo=javascript&color=db0&logoColor=fff" alt="JavaScript" />
</p>

This example shows how to build live cursors with [Liveblocks](https://liveblocks.io) and [esbuild](https://esbuild.github.io/).

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/live-cursors.png" width="536" alt="Live Cursors" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example javascript-live-cursors --no-api-key --no-vercel
```

This will download the example and install the example. Next, you must:

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`app.js`](./app.js) with your **public** key
- Run `npm run build` and open `static/index.html` in your browser

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`app.ts`](./app.ts) with your **public** key
- Run `npm run build` and open `static/index.html` in your browser

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use the following command:

```bash
npx create-liveblocks-app@latest --example javascript-live-cursors --vercel
```

This will download the example and ask permission to open your browser, enabling you to deploy to Vercel. Next, you must:

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`app.js`](./app.js) with your **public** key
- Push a commit to update the Vercel demo with the key
- Run `npm run build` and open `static/index.html` in your browser

</details>
