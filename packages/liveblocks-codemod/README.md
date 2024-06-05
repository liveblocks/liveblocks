<p align="center">
  <a href="https://liveblocks.io#gh-light-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-light.svg" alt="Liveblocks" />
  </a>
  <a href="https://liveblocks.io#gh-dark-mode-only">
    <img src="https://raw.githubusercontent.com/liveblocks/liveblocks/main/.github/assets/header-dark.svg" alt="Liveblocks" />
  </a>
</p>

# `@liveblocks/codemod`

Codemods for updating Liveblocks apps.

## Transforms

### 2.0

#### `react-comments-to-react-ui`

Transforms `@liveblocks/react-comments` imports to `@liveblocks/react-ui` and
`<CommentsConfig />` to `<LiveblocksUIConfig />`.

```shell
npx @liveblocks/codemod@latest react-comments-to-react-ui
```
