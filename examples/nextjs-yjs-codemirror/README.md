<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative Rich Text Editor (CodeMirror)

This example shows how to build a collaborative text editor with [Liveblocks](https://liveblocks.io), [Yjs](https://docs.yjs.dev), [CodeMirror](https://codemirror.net/), and [Next.js](https://nextjs.org/).

As users edit the document, changes will be automatically persisted and synced—allowing for a code editor that updates in real-time across clients. Users will also be able to see each other’s their cursors in the document.

## Getting started

Run the following command to set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **public** key from the [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **public** key as the `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking [this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-yjs-codemirror) on CodeSandbox, create the `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` environment variable as a [secret](https://codesandbox.io/docs/secrets).

</details>
