<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Rich Text Editor (Quill)

<p>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/javascript-yjs-quill">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/javascript-message?style=flat&logo=javascript&color=db0&logoColor=fff" alt="JavaScript" />
  <img src="https://img.shields.io/badge/yjs-message?style=flat&color=0bd" alt="Yjs" />
  <img src="https://img.shields.io/badge/quill-message?style=flat&color=db0" alt="Quill" />
</p>

This example shows how to build a collaborative rich text editor with
[Liveblocks](https://liveblocks.io), [Yjs](https://docs.yjs.dev),
[Quill](https://quilljs.com/) and [esbuild](https://esbuild.github.io/).

As users edit the document, changes will be automatically persisted and
synced—allowing for an editor that updates in real-time across clients. Users
will also be able to see who see each other’s cursors in the document.

<img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/examples/text-editor.png" width="536" alt="Collaborative Text Editor" />

## Getting started

Run the following command to set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Replace `pk_YOUR_PUBLIC_KEY` in [`app.js`](./app.js) with your **public** key
- Run `npm run build` and open `static/index.html` in your browser

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/javascript-yjs-quill)
on CodeSandbox, replace `pk_YOUR_PUBLIC_KEY` in [`app.js`](./app.js) with your
**public** key

</details>
