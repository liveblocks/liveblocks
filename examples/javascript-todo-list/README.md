<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative To-do List

<p>
  <a href="https://liveblocks.io/examples/collaborative-todo-list/javascript/preview">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTE2Ljg0OSA0Ljc1SDBsNC44NDggNS4wNzV2Ny4wMDhsMTItMTIuMDgzWk03LjE1IDE5LjI1SDI0bC00Ljg0OS01LjA3NVY3LjE2N2wtMTIgMTIuMDgzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/javascript-todo-list">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/javascript-message?style=flat&logo=javascript&color=db0&logoColor=fff" alt="JavaScript" />
</p>

This example shows how to build a collaborative to-do list with
[Liveblocks](https://liveblocks.io) and [esbuild](https://esbuild.github.io/).

As users edit the list, changes will be automatically persisted and
synced—allowing for a list that updates in real-time across clients. Users will
also be able to see who else is currently online and when a user is typing.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/todo-list.png" width="536" alt="Collaborative To-do List" />

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`app.ts`](./app.ts) by your **public** key
- Run `npm run build` and open `static/index.html` in your browser

### Tutorial

Follow our
[step by step tutorial](https://liveblocks.io/docs/tutorials/collaborative-to-do-list/javascript)
to build it from scratch.
