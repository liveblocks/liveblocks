<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Whiteboard

<p>
  <a href="https://liveblocks.io/examples/collaborative-whiteboard/redux/preview">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/redux-whiteboard">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/redux-message?style=flat&logo=redux&color=74b&logoColor=fff" alt="Redux" />
</p>

This example shows how to build a collaborative whiteboard with
[Liveblocks](https://liveblocks.io), [Next.js](https://nextjs.org/) and
[Redux](https://redux-toolkit.js.org/).

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/whiteboard.png" width="536" alt="Collaborative Whiteboard" />

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example redux-whiteboard --no-api-key --no-vercel
```

This will download the example and install the example. Next, you must:

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`src/store.js`](./src/store.js) with your **public** key
- Run `npm run start` and open `http://localhost:3000` in your browser

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create a`.env.local` file and add your **public** key as the
  `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment variable
- Run `npm run dev` and open `http://localhost:3000` in your browser

## Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example redux-whiteboard --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel. Next, you must:

- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Add your **public** key as the `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment
  variable in the Vercel dashboard
- Run `npm run start` and open `http://localhost:3000` in your browser

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking [this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/redux-whiteboard) on CodeSandbox, create the `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment variable as a [public](https://codesandbox.io/docs/secrets).

</details>

### Tutorial

Follow our
[step by step tutorial](https://liveblocks.io/docs/tutorials/collaborative-online-whiteboard/react-redux)
to build it from scratch.
