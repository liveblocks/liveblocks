<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

# Live Cursors

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/express-javascript-live-cursors">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/javascript-message?style=flat&logo=javascript&color=db0&logoColor=fff" alt="JavaScript" />
</p>

This example shows how to build live cursors without relying on a front-end framework—using [Express](https://expressjs.com/) for authentication and [esbuild](https://esbuild.github.io/) for bundling.

![Live Cursors](.github/assets/examples/live-cursors.png)

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env` file and add your **secret** key as the `LIVEBLOCKS_SECRET_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)
