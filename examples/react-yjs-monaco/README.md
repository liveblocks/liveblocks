<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Code Editor (Monaco)

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/react-yjs-monaco">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/yjs-message?style=flat&color=0bd" alt="Yjs" />
  <img src="https://img.shields.io/badge/monaco-message?style=flat&color=627" alt="Monaco" />
</p>

This example shows how to build a collaborative code editor with [Liveblocks](https://liveblocks.io), [Yjs](https://docs.yjs.dev), [Monaco](https://microsoft.github.io/monaco-editor/), and [React](https://reactjs.org/).

As users edit the code, changes will be automatically persisted and synced—allowing for collaborative code editing experience. Users will also be able to see who else is currently online and each others cursors.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/code-editor.png" width="536" alt="Collaborative Code Editor" />

## Getting started

Run the following command to set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`liveblocks.config.js`](./src/liveblocks.config.js) with your **public** key
- Run `npm run dev` and open `http://localhost:3000` in your browser

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking [this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/react-yjs-monaco) on CodeSandbox, replace `pk_YOUR_PUBLIC_KEY` in [`liveblocks.config.js`](./src/liveblocks.config.js) with your **public** key.

</details>
