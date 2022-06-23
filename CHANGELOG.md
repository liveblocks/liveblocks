# v0.17.0 (not yet released)

For information, please read our
[Upgrade Guide](https://preview.liveblocks.io/docs/guides/upgrading/0.17).

### TypeScript improvements

This release contains major TypeScript improvements. The recommended setup now
is that you define your own Presence and Storage types at the highest level
(i.e. where you set up the room).

After that initial one-time setup, you will not need any extra type annotations
anywhere for your Liveblocks code, and every Liveblocks API will now know about
your own Presence and Storage shapes and support auto-completion.

To learn how to set that up, follow the instructions in our
[Upgrade Guide](https://preview.liveblocks.io/docs/guides/upgrading/0.17).

- There are no more `any` types in `@liveblocks/client` and `@liveblocks/react`
- All APIs that work with Presence data will now require it to be
  JSON-serializable
- All APIs that work with Storage data will now require it to be LSON (= JSON +
  Live structures)
- Various Live structures now take mandatory type params:
  - `LiveMap<K, V>` (just like `Map<K, V>`)
  - `LiveObject<{ a: number, b: string }>` (just like, for example,
    `{ a: number, b: string }`)
  - `LiveList<T>` (just like `Array<T>`)
- The built-in `Presence` type is now deprecated and will get removed in 0.18.
  The idea is that you bring whatever type definition for Presence that makes
  sense to your own app instead.

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
    [Recommended Upgrade Steps section](https://preview.liveblocks.io/docs/guides/upgrading/0.17#recommended-upgrade-steps)
    within our
    [Upgrade Guide](https://preview.liveblocks.io/docs/guides/upgrading/0.17)
  - The second argument to `useList()`, `useObject()`, and `useMap()` is
    deprecated
  - The RoomProvider's `defaultPresence` is renamed to `initialPresence`
  - The RoomProvider's `defaultStorageRoot` is renamed to `initialStorage`

### Other

Various internal refactorings.

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
