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

- Various internal refactorings

- Fix: if you're using `@liveblocks/client` in a ES2015 context, you no longer
  have to polyfill `Object.fromEntries()`.

# v0.16.4

## All packages

- Improve our generated bundles. They are now even more tree-shakable, and smaller!

## `@liveblocks/client`

Some APIs are being **deprecated** and may start showing console warnings when used:

- The `defaultPresence` option to `client.enter()` will get renamed to `initialPresence`
- The `defaultStorageRoot` option to `client.enter()` will get renamed to `initialStorage`

## `@liveblocks/react`

Some APIs are being **deprecated** and may start showing console warnings when used:

- The RoomProvider's `defaultPresence` will get renamed to `initialPresence`
- The RoomProvider's `defaultStorageRoot` will get renamed to `initialStorage`
- The second argument to `useList()`, `useObject()`, and `useMap()` is deprecated

For information, please see https://bit.ly/3Niy5aP.

# v0.16.3

Fix bug where internal presence state could not get restored correctly after
undo/redo in certain circumstances.

## `@liveblocks/zustand` & `@liveblocks/redux`

Fixes an issue when initializing an array with items would result in having duplicated items in other clients.
Examples:

- Client A updates state : `{ list: [0]}`
- Client B states is updated to : `{ list: [0, 0]}`

# v0.16.2

## `@liveblocks/client`

Fix small bug related to new `JsonObject` type, which would reject some values
that were legal JSON objects.

# v0.16.1

## `@liveblocks/react`

Fix issue with React 18 and StrictMode.

# v0.16.0

## `@liveblocks/client`

### `LiveList.set`

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

### Typescript improvements

@nvie improved our typescript definitions! They are more precise and
restrictive (for your own good :)). If typescript errors appears after
upgrading to `0.16.0` and they are not clear, please create a Github issue and
we'll help you.

More information here: https://github.com/liveblocks/liveblocks/pull/150
