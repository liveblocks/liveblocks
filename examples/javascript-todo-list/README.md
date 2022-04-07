<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

<br/>

# To-do List

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/javascript-todo-list">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/javascript-message?style=flat&logo=javascript&color=db0&logoColor=fff" alt="JavaScript" />
</p>

This example shows how to build a collaborative to-do list without relying on a front-end framework—using [esbuild](https://esbuild.github.io/) for bundling.

As users edit the list, changes will be automatically persisted and synced—allowing for a list that updates in real-time across clients. Users will also be able to see who else is currently online and when a user is typing.

![To-do List](.github/assets/examples/todo-list.png)

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`app.js`](./examples/javascript-todo-list/app.js) by your **public** key
- Run `npm run build` and open `static/index.html` in your browser

### Tutorial

Follow our [step by step tutorial](https://liveblocks.io/docs/tutorials/multiplayer-to-do-list/javascript) to build it from scratch.
