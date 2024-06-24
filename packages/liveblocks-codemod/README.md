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

### General

#### `remove-liveblocks-config-contexts`

Replaces `createRoomContext` and `createLiveblocksContext` in `liveblock.config`
files with global `Liveblocks` types and updates all imports to
`@liveblocks/react` accordingly.

```shell
npx @liveblocks/codemod@latest remove-liveblocks-config-contexts
```

If you export the Suspense versions of hooks from `createRoomContext` and
`createLiveblocksContext`, add the `--suspense` flag to update all imports to
`@liveblocks/react/suspense` instead.

```shell
npx @liveblocks/codemod@latest remove-liveblocks-config-contexts --suspense
```

#### `remove-unneeded-type-params`

Removes no longer needed type params from Liveblocks types (only use this if you
are using the global types).

```shell
npx @liveblocks/codemod@latest remove-unneeded-type-params
```

#### `simplify-client-side-suspense-children`

Removes any function-style body from `<ClientSideSuspense>`’s `children` prop.

```shell
npx @liveblocks/codemod@latest simplify-client-side-suspense-children
```

### 2.0 (breaking changes)

Liveblocks 2.0 comes with a number of breaking changes and most are covered by
the following codemods, see the
[upgrade guide](https://liveblocks.io/docs/platform/upgrading/2.0) to learn more
about the changes.

#### `react-comments-to-react-ui`

Updates `@liveblocks/react-comments` to `@liveblocks/react-ui` and renames
`<CommentsConfig />` to `<LiveblocksUIConfig />`.

```shell
npx @liveblocks/codemod@latest react-comments-to-react-ui
```

#### `room-info-to-room-data`

Renames `RoomInfo` type from `@liveblocks/node` to `RoomData`.

```shell
npx @liveblocks/codemod@latest room-info-to-room-data
```

#### `remove-yjs-default-export`

Replaces the default import of `@liveblocks/yjs` by a named
`LiveblocksYjsProvider` one, and update its usage accordingly.

```shell
npx @liveblocks/codemod@latest remove-yjs-default-export
```

#### `live-list-constructor`

Adds an array to empty `LiveList` constructors.

```shell
npx @liveblocks/codemod@latest live-list-constructor
```
