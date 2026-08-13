<p>
  <a href="https://liveblocks.io#gh-light-mode-only"><img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" /></a>
  <a href="https://liveblocks.io#gh-dark-mode-only"><img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" /></a>
</p>

# `@liveblocks/prosemirror`

<p>
  <a href="https://npmjs.org/package/@liveblocks/prosemirror"><img src="https://img.shields.io/npm/v/@liveblocks/prosemirror?style=flat&label=npm&color=c33" alt="NPM" /></a>
  <a href="https://bundlephobia.com/package/@liveblocks/prosemirror"><img src="https://img.shields.io/bundlephobia/minzip/@liveblocks/prosemirror?style=flat&label=size&color=09f" alt="Size" /></a>
  <a href="https://github.com/liveblocks/liveblocks/blob/main/licenses/LICENSE-APACHE-2.0"><img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License" /></a>
</p>

`@liveblocks/prosemirror` provides plugins that integrate
[ProseMirror](https://prosemirror.net/) editors with Liveblocks Storage. It
keeps editor documents in sync, stores text nodes as `LiveText`, and displays
remote carets and selections.

If you are using Tiptap, use
[`@liveblocks/react-tiptap`](../liveblocks-react-tiptap) with
`collaborationMode: "liveblocks"` instead. It builds on this package and
provides a Tiptap extension and React components.

This package is for client-side ProseMirror editors backed by Liveblocks
Storage. For server-side editing of existing Tiptap and BlockNote documents, use
[`@liveblocks/node-prosemirror`](../liveblocks-node-prosemirror).

## Installation

```
npm install @liveblocks/client @liveblocks/prosemirror prosemirror-model prosemirror-state prosemirror-view
```

Import the package stylesheet to display remote carets and selections:

```ts
import "@liveblocks/prosemirror/styles.css";
```

## Documentation

Read the
[documentation](https://liveblocks.io/docs/api-reference/liveblocks-prosemirror)
for setup instructions and API references.

## Examples

Explore our [collaborative examples](https://liveblocks.io/examples) to help you
get started.

> All examples are open-source and live in this repository, within
> [`/examples`](../../examples).

## Releases

See the [latest changes](https://github.com/liveblocks/liveblocks/releases) or
learn more about
[upcoming releases](https://github.com/liveblocks/liveblocks/milestones).

## Community

- [Discord](https://liveblocks.io/discord) - To get involved with the Liveblocks
  community, ask questions and share tips.
- [X](https://x.com/liveblocks) - To receive updates, announcements, blog posts,
  and general Liveblocks tips.

## License

Licensed under the Apache License 2.0, Copyright © 2021-present
[Liveblocks](https://liveblocks.io).

See [LICENSE](../../licenses/LICENSE-APACHE-2.0) for more information.
