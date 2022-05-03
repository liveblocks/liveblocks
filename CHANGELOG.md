# vNEXT (v0.16.3)

...

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
