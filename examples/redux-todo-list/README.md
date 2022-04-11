<p align="center">
  <a href="https://liveblocks.io">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header.svg" alt="Liveblocks" />
  </a>
</p>

# To-do List

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/redux-todo-list">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/redux-message?style=flat&logo=redux&color=74b&logoColor=fff" alt="Redux" />
</p>

This example shows how to build a collaborative to-do list with [Liveblocks](https://liveblocks.io), [React](https://reactjs.org/) and [Redux](https://redux-toolkit.js.org/).

As users edit the list, changes will be automatically persisted and synced—allowing for a list that updates in real-time across clients. Users will also be able to see who else is currently online and when a user is typing.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/todo-list.png" width="800" alt="To-do List" />

## Getting started

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `PUBLIC_KEY` in [`store.js`](./examples/redux-todo-list/src/store.js) by your **public** key
- Run `npm run start` and go to [http://localhost:3000](http://localhost:3000)

### Tutorial

Follow our [step by step tutorial](https://liveblocks.io/docs/tutorials/multiplayer-to-do-list/react-redux) to build it from scratch.
