<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Multiplayer Handsontable (Liveblocks Storage)

<p>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to sync every cell of a
[Handsontable](https://www.handsontable.com/) grid in realtime with
[Liveblocks Storage](https://liveblocks.io/docs/ready-made-features/storage)
using [`useStorage`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorage)
and [`useMutation`](https://liveblocks.io/docs/api-reference/liveblocks-react#useMutation),
plus [Next.js](https://nextjs.org/). Open the app in two browser windows to see
edits merge live.

## Getting started

### Manual setup

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **secret** key as the
  `LIVEBLOCKS_SECRET_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)
