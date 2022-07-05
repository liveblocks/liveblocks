# v0.18.0 (not released yet)

### Breaking changes

- Remove support for directly importing hooks from **@liveblocks/client** (e.g.
  `import { useMyPresence } from '@liveblocks/react'`). If you’re still using
  these imports, see the
  [Upgrade Guide for 0.17](https://liveblocks.io/docs/guides/upgrading/0.17)
  for instructions.

---

# v0.17.5

In **@liveblocks/react**:

- Fix bug where changing the `key` argument of `useMap()`, `useList()`,
  `useObject()` did not resubscribe to updates correctly
- Ignore changes to the `RoomProvider`'s initial presence/storage props on
  subsequent renders. This makes it behave closer to `useState(initialState)`

# v0.17.4

Fix missing documentation for hooks created via `createRoomContext()`.

# v0.17.1

Fix `@liveblocks/nodes` packaging.

# v0.17.0

For information, please read our
[Upgrade Guide](https://liveblocks.io/docs/guides/upgrading/0.17).

### TypeScript improvements ✨

This release contains major TypeScript improvements. The recommended setup now
is that you define your own Presence and Storage types at the highest level
(i.e. where you set up the room). After that initial one-time setup, you will no
longer need to provide any extra type annotations anywhere for your Liveblocks
code! 🙌

To learn how to set that up, follow the instructions in our
[Upgrade Guide](https://liveblocks.io/docs/guides/upgrading/0.17).

- No more `any` types used (in `@liveblocks/client` and `@liveblocks/react`)
- All APIs that work with Presence data will now require it to be
  JSON-serializable
- All APIs that work with Storage data will now require it to be LSON (= JSON +
  Live structures)
- All Live structures now take mandatory type params for their payloads, just
  like the built-in array, object, and map types do:
  - `LiveMap<K, V>` (like `Map<K, V>`)
  - `LiveObject<{ a: number, b: string }>` (like, for example,
    `{ a: number, b: string }`)
  - `LiveList<T>` (like `Array<T>`)

### React Native support ✨

We now support React Native! To learn how to use Liveblocks in your React Native
projects, see our
[API reference](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientReactNative).
It's surprisingly simple!

### New APIs ✨

- In **@liveblocks/react**:

  - [`createRoomContext()`](https://liveblocks.io/docs/api-reference/liveblocks-react#createRoomContext)
    is now the preferred way to initialize hooks.

- In the API:

  - New endpoint to
    [Get Users in a Room](https://liveblocks.io/docs/api-reference/rest-api-endpoints#GetRoomUsers)
  - New endpoint to
    [Get a list of all Rooms](https://liveblocks.io/docs/api-reference/rest-api-endpoints#GetRooms)

### Bug fixes 🐛

- Improved conflict resolution on LiveList
- Various minor internal bug fixes

### Breaking changes

- In **@liveblocks/client**:

  - Removed old `Room.unsubscribe()` API

### New deprecations

- In **@liveblocks/client**:

  - The `defaultPresence` option to `client.enter()` will get renamed to
    `initialPresence`
  - The `defaultStorageRoot` option to `client.enter()` will get renamed to
    `initialStorage`
  - Calling `new LiveMap(null)` will stop working. Please use `new LiveMap()`,
    or `new LiveMap([])`

- In **@liveblocks/react**:

  - Importing the React hooks directly is deprecated, instead use the new
    `createRoomContext()` helper. For help, read the
    [Recommended Upgrade Steps section](https://liveblocks.io/docs/guides/upgrading/0.17#recommended-upgrade-steps)
    within our [Upgrade Guide](https://liveblocks.io/docs/guides/upgrading/0.17)
  - The second argument to `useList()`, `useObject()`, and `useMap()` is
    deprecated
  - The RoomProvider's `defaultPresence` is renamed to `initialPresence`
  - The RoomProvider's `defaultStorageRoot` is renamed to `initialStorage`

---

# v0.16.17

Fix bug in internal code where some legal authentication tokens would be
considered invalid.

---

# v0.16.16

Internals only.

---

# v0.16.15

Internals only.

---

# v0.16.14

Fix an issue where the current user's info would not properly display accented
characters.

---

# v0.16.13

(Unpublished.)

---

# v0.16.12

Internals only.

---

# v0.16.11

Expose helper type to help users adopt to using Live structures with interfaces
they don't own.

---

# v0.16.10

Restructures a few more internals.

---

# v0.16.9

Restructures a few internals.

---

# v0.16.8

Fix bug in private/internal code.

---

# v0.16.7

Fix bug in private/internal code.

---

# v0.16.6

Fix bug in example code suggested in deprecation warning.

---

# v0.16.5

### All packages

- Various internal refactorings

### Bug fixes

- In **@liveblocks/client**:

  - If you're using `@liveblocks/client` in a ES2015 context, you no longer have
    to polyfill `Object.fromEntries()`.

---

# v0.16.4

### All packages

- Improve our generated bundles. They are now even more tree-shakable, and
  smaller!
- Some APIs are being deprecation and will show warnings in the dev console when
  used

---

# v0.16.3

### Bug fixes

- In **@liveblocks/client**:

  - Fix bug where internal presence state could not get restored correctly after
    undo/redo in certain circumstances.

- In **@liveblocks/zustand** and **@liveblocks/redux**:

  - Fixes an issue when initializing an array with items would result in having
    duplicated items in other clients. Example:

    - Client A updates state : `{ list: [0] }`
    - Client B states is updated to : `{ list: [0, 0] }`

---

# v0.16.2

### Bug fixes

- In **@liveblocks/client**:

  - Fix small bug related to new `JsonObject` type, which would reject some
    values that were legal JSON objects.

---

# v0.16.1

### Bug fixes

- In **@liveblocks/react**:

  - Fix issue with React 18 and StrictMode.

---

# v0.16.0

### New APIs

#### `LiveList.set`

Set one element at a specified index.

```typescript
const list = new LiveList(["🦁", "🦊", "🐵"]);
list.set(0, "🐺");
list.toArray(); // equals ["🐺", "🦊", "🐵"]
```

https://github.com/liveblocks/liveblocks/pull/147 for more information

⚠️ **_Before using `LiveList.set`, you need to make sure that all connected
clients are using `0.16.0`. If a client is connected to a room with version
`< 0.16`, `LiveList.set` might lead to slightly unexpected behavior._**

### TypeScript improvements

@nvie improved our typescript definitions! They are more precise and restrictive
(for your own good :)). If typescript errors appears after upgrading to `0.16.0`
and they are not clear, please create a Github issue and we'll help you.

More information here: https://github.com/liveblocks/liveblocks/pull/150
