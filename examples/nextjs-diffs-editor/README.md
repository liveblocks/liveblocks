<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# Collaborative code editor (Next.js + diffs + LiveText)

<p>
  <a href="https://liveblocks.io/examples/collaborative-code-editor/nextjs-diffs-editor">
    <img src="https://img.shields.io/badge/live%20preview-message?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjQgMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8zL3ZnIj48cGF0aCBkPSJNMTYuODQ5IDQuNzVIMGw0Ljg0OCA1LjA3NXY3LjAwOGwxMi0xMi4wODNaTTcuMTUgMTkuMjVIMjRsLTQuODQ5LTUuMDc1VjcuMTY3bC0xMiAxMi4wODNaIiBmaWxsPSIjZmZmIi8+PC9zdmc+&color=333" alt="Live Preview" />
  </a>
  <a href="https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-diffs-editor">
    <img src="https://img.shields.io/badge/open%20in%20codesandbox-message?style=flat&logo=codesandbox&color=333&logoColor=fff" alt="Open in CodeSandbox" />
  </a>
  <img src="https://img.shields.io/badge/react-message?style=flat&logo=react&color=0bd&logoColor=fff" alt="React" />
  <img src="https://img.shields.io/badge/next.js-message?style=flat&logo=next.js&color=07f&logoColor=fff" alt="Next.js" />
</p>

This example shows how to build a VS Code-like multiplayer code editor using
[Liveblocks](https://liveblocks.io), the experimental LiveText storage type,
[Pierre's diffs](https://diffs.com) edit mode and
[Pierre's trees](https://trees.software) file tree, with live carets and
selections. Open the editor in multiple browser tabs to edit code together in
real time, browse the shared project file tree, and see other users' carets as
they type.

> **Note:** LiveText is experimental. This example pins `@liveblocks/*` packages
> to an experimental release (`3.23.1-exp3`).

## Getting started

Run the following command to try this example locally:

```bash
npx create-liveblocks-app@latest --example nextjs-diffs-editor --api-key
```

This will download the example and ask permission to open your browser, enabling
you to automatically get your API key from your
[liveblocks.io](https://liveblocks.io) account.

### Manual setup

<details><summary>Read more</summary>

<p></p>

Alternatively, you can set up your project manually:

- Install all dependencies with `npm install`
- Create an account on [liveblocks.io](https://liveblocks.io/dashboard)
- Copy your **secret** key from the
  [dashboard](https://liveblocks.io/dashboard/apikeys)
- Create an `.env.local` file and add your **secret** key as the
  `LIVEBLOCKS_SECRET_KEY` environment variable
- Run `npm run dev` and go to [http://localhost:3000](http://localhost:3000)

To see realtime sync, open the page in two browser tabs. Edits to the code,
file tree, and live carets sync across both tabs.

To test against a local Liveblocks dev server, also set `LIVEBLOCKS_BASE_URL`
and `NEXT_PUBLIC_LIVEBLOCKS_BASE_URL` to your server URL (for example
`http://localhost:1153`).

</details>

### Deploy on Vercel

<details><summary>Read more</summary>

<p></p>

To both deploy on [Vercel](https://vercel.com), and run the example locally, use
the following command:

```bash
npx create-liveblocks-app@latest --example nextjs-diffs-editor --vercel
```

This will download the example and ask permission to open your browser, enabling
you to deploy to Vercel.

</details>

### Develop on CodeSandbox

<details><summary>Read more</summary>

<p></p>

After forking
[this example](https://codesandbox.io/s/github/liveblocks/liveblocks/tree/main/examples/nextjs-diffs-editor)
on CodeSandbox, create the `LIVEBLOCKS_SECRET_KEY` environment variable as a
[secret](https://codesandbox.io/docs/secrets).

</details>
