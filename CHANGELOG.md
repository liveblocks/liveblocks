# v1.4.0

### DevTools

- New Yjs tab: visualize Yjs documents as a diagram, a tree, or as a list of
  operations, and inspect Awareness at the same time as Presence.
- New Events tab: inspect all custom Events a client receives in an event
  timeline, for easy testing/debugging.

### `@liveblocks/yjs`

- Add support for the Liveblocks [DevTools](https://liveblocks.io/devtools).

### `@liveblocks/client`

- Broadcast event messages now include a `user` property to indicate the user
  that sent the event:
  ```tsx
  room.subscribe("event", ({ event, user }) => {
    //                              ^^^^ New!
  });
  ```

### `@liveblocks/react`

- Broadcast event messages now include a `user` property to indicate the user
  that sent the event:
  ```tsx
  useEventListener(({ event, user }) => {
    //                       ^^^^ New!
  });
  ```
- **Breaking (beta):** Comments' hook `useThreads` now returns an object in its
  Suspense version. (`const threads = useThreads()` becomes
  `const { threads } = useThreads()`)

### `@liveblocks/react-comments`

- **Breaking (beta):** `Comment`’s `indentBody` and `Thread`’s
  `indentCommentBody` were renamed to `indentContent` and `indentCommentContent`
  respectively. `Thread`’s `onResolveChange` was renamed to `onResolvedChange`.
- Add emoji button in `Composer`.

### `@liveblocks/node`

- Support using `@liveblocks/node` in
  [Edge runtimes](https://vercel.com/docs/functions/edge-functions/edge-runtime).

# v1.3.6

### `@liveblocks/client`

- Support `unstable_fallbackToHTTP` client option when using any auth token type
  (previously it only worked when using single-room tokens, which we no longer
  recommend since 1.2)

# v1.3.5

### `@liveblocks/react`

- Officially mark `useList()`, `useMap()`, and `useObject()` as deprecated in
  JSDoc comments (we stopped recommending them since the release of 0.18)
- Deduplicate Comments requests and improve how race conditions are handled
  during mutations.
- Fix non-Suspense Comments hooks not working properly in some situations.

### `@liveblocks/react-comments`

- **Breaking (beta):** Replace the render prop API (e.g. `renderMention`,
  `renderLink`, etc) by a single `components` prop. (e.g.
  `components={{ Mention, Link }}`)
- Fix overflowing `Composer.Suggestions`.
- Reduce the impact of icons on bundle size.

# v1.3.4

### `@liveblocks/react`

- Fix confusing `Error: "undefined" is not a valid event name` error when using
  the (deprecated) `useMap()`, `useObject()`, or `useList()` hooks on
  uninitialized storage values.

# v1.3.3

### `@liveblocks/*`

- Fix unescaped room IDs when using Comments.

### `@liveblocks/react-comments`

- Add support for auto-links. (e.g. `"www.liveblocks.io"`)

# v1.3.2

### `@liveblocks/client`

- The client will disconnect with an error if your `/api/liveblocks-auth`
  backend returns reused/cached tokens. It’s important that auth tokens are
  always freshly generated, and never get cached or reused. (The client itself
  will cache and reuse tokens already, so implementing additional caching in
  your backend isn’t needed, and could even cause reconnection issues.)

# v1.3.1

### `@liveblocks/client`

- Actually include the new Clear History API.

### `@liveblocks/react`

- Fix missing dependency declaration.

# v1.3.0

This release marks the initial release of
[Liveblocks Comments](https://liveblocks.io/comments), which is currently in
private beta.

### `@liveblocks/client`

- New history API: `room.history.clear()` allows you to explicitly clear the
  history, which resets the ability to undo beyond the current state.
- Removed long deprecated methods:
  - `others.count` → Use `others.length` instead
  - `others.toArray()` → Use `others` instead (it’s already an array)
- Deprecated the `Others<P, U>` type → Use `readonly User<P, U>[]` instead.

### `@liveblocks/react`

- Add support for Comments.
- `UserMeta["info"]` can no longer be a scalar value.

### `@liveblocks/react-comments`

- Initial release.

### `@liveblocks/node`

- Add Comments helpers to Client.
- Add Comments webhook events.

# v1.2.4

### `@liveblocks/node`

- Fixes a bug where sending an empty (or non-string) user ID with
  `.identifyUser` would confusingly get reported as an HTTP 503.

# v1.2.3

### `@liveblocks/client`

- Improve configuration error messages to be more user friendly.
- Fix bug where entering a new room could potentially initialize the undo stack
  incorrectly.

### `create-liveblocks-app`

- Fix Suspense option when specifying a framework.
- Add helpful comments by default.

# v1.2.2

### `@liveblocks/node`

- Add Yjs document change event (`YDocUpdatedEvent`) to `WebhookHandler`.
- Allow `Header` object to be passed to `headers` in
  `WebhookHandler.verifyRequest()`

# v1.2.1

### `@liveblocks/node`

- Fix session.allow to support path up to 128 characters to meet room id length
  requirement.

# v1.2.0

### `@liveblocks/*`

- Support the new and improved Liveblocks authorization.
- Change client logic to stop retrying if room is full. Instead, the client will
  now disconnect. To retry, call `room.reconnect()` explicitly.

### `@liveblocks/node`

- Add new APIs for authorization. See our migration guide for tips on how to
  adopt the new style of authorizing your Liveblocks clients.

# v1.1.8

- Fix a small TypeScript issue introduced in 1.1.7.

# v1.1.7

### `@liveblocks/client`

- When initializing the client with a
  [custom auth callback](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientCallback),
  you can now return `{ error: "forbidden", reason: ... }` as the response,
  which the client will treat as a sign to stop retrying. The client will then
  disconnect from the room, instead of remaining in `"connecting"` status
  indefinitely.

### `@liveblocks/react`

- Fix a bug with `useSelf()` where it would not correctly re-render after
  entering an empty room. It’s now consistent again with `useMyPresence()`.

### DevTools

- Fix a bug in the Liveblocks [DevTools](https://liveblocks.io/devtools) panel
  where the "me" view would incorrectly stay empty after entering an empty room.

# v1.1.6

### `@liveblocks/*`

- Loosen duplicate import detection so it won't throw when used in test runners
  that deliberately run multiple instances of a module (like Jest or Playwright
  can do).

# v1.1.5

### `@liveblocks/*`

- Ship all of our packages as both ESM and CJS modules again (restore the
  changes that 1.1.3 originally introduced).
- Auto-detect if multiple copies of Liveblocks are included in your production
  bundle. If so, a help page is presented that will help you resolve this issue.
- Fix a bug where the room internals could become non-functional when used in
  combination with Immer due to Immer’s excessive auto-freezing, which would
  break the room’s internals. (This became an issue since Liveblocks 1.1 was
  released.)

# v1.1.4

- Undo the changes made in 1.1.3. We’ve got some bug reports where Liveblocks
  could still be doubly-included in production bundles (in some bundler setups
  only), with storage data corruptions as a possible result. We’re
  investigating.

# v1.1.3

Ship all of our packages as both ESM and CJS modules. By upgrading, your
project’s bundler can now perform (better) tree-shaking on the Liveblocks code.

You can expect (at least) the following bundle size reductions:

- `@liveblocks/client` from 80kB → 70kB
- `@liveblocks/react` from 129kB → 80kB
- `@liveblocks/redux` from 84kB → 38kB
- `@liveblocks/zustand` from 83kB → 37kB
- `@liveblocks/yjs` from 129kB → 74kB

# v1.1.2

### `@liveblocks/yjs`

Added Yjs support to **open beta** through the new `@liveblocks/yjs` package
(not stable yet).

### Fixes

- Fixes a missing internal export.

# v1.1.1

- Fixes a bug where under certain circumstances the Liveblocks client could
  incorrectly throw a `Not started yet` error message.

# v1.1.0

This release improves the client’s internals to ensure a more reliable
connection with Liveblocks servers.

### `@liveblocks/client`

- New APIs:
  - `room.getStatus()`: returns the current status of the WebSocket connection:
    `"initial"`, `"connecting"`, `"connected"`, `"reconnecting"`, or
    `"disconnected"`
  - `room.subscribe("status")`: subscribe to changes of the connection status.
  - `room.subscribe("lost-connection")`: high-level API to get informed when
    Liveblocks’ automatic reconnection process is taking longer than usual, so
    you can show a toast message on screen. (See this
    [example](https://liveblocks.io/examples/connection-status) for an
    illustration.)
- New behavior:
  - The client will stop retrying to establish a connection in cases where
    retrying would not help. For example an explicit 403 forbidden response from
    your backend, or a configuration error.
  - The client will more quickly reconnect even after long periods of sleep.

### `@liveblocks/react`

- New APIs:
  - `useStatus()` - React hook version of `room.getStatus()`
  - `useLostConnectionListener()` - React hook version of
    `room.subscribe("lost-connection")` (See this
    [example](https://liveblocks.io/examples/connection-status) for an
    illustration.)

### Bugs fixed

- Reconnection would sometimes not work after long periods of sleep. Waking up
  is now instant.
- React clients using Suspense could sometimes incorrectly bounce back to the
  Suspense boundary after a successful load. No longer!
- Client could sometimes not load storage after reconnecting. Not anymore!
- Others array will no longer flash during an internal reconnect.
- DevTools now keeps working even when the client goes offline.

### Deprecated APIs

These APIs still work, but are replaced by newer APIs. The old APIs will be
removed in a future release of Liveblocks.

Old connection status codes are replaced by the new ones:

| ❌ Old statuses | ✅ New statuses |
| --------------- | --------------- |
| closed          | initial         |
| authenticating  | connecting      |
| connecting      | connecting      |
| open            | connected       |
| unavailable     | reconnecting    |
| failed          | disconnected    |

Recommended steps to upgrade:

- ❌ `room.getConnectionState()` → ✅ `room.getStatus()`
- ❌ `room.subscribe('connection')` → ✅ `room.subscribe('status')`
- Old client options:
  - ❌ `clientOptions.fetchPolyfill`
  - ❌ `clientOptions.WebSocketPolyfill` → ✅
    `clientOptions.polyfills: { fetch, WebSocket }`

# v1.0.12

### `create-liveblocks-app`

- Added `export type TypedRoom = Room<...>` to init command for non-React apps.

# v1.0.11

### `@liveblocks/client`

- Fix a bug where undo/redo on `LiveObject` creates exponentially larger deltas.

# v1.0.10

### `@liveblocks/client`

- Fix a bug related to proactive token expiration detection.
- Internal refactorings.
- Add unstable_fallbackToHTTP option to the core client to support messages over
  1MB.

### `@liveblocks/node`

- Fix incorrect status code when Liveblocks server cannot be reached
  temporarily.

# v1.0.9

### `@liveblocks/client`

- Export `LiveListUpdate`, `LiveMapUpdate`, and `LiveObjectUpdate` types used by
  the storage update callback.
- Export new utility, `toPlainLson`, to assist in calling the initialize storage
  API.
- Internal refactorings.

# v1.0.8

### `@liveblocks/client`

- Internal refactorings.

### `create-liveblocks-app`

- Added
  [flags](https://github.com/liveblocks/liveblocks/tree/main/packages/create-liveblocks-app#flags-optional)
  for creating config files with `--init`. (e.g. `--framework react`)
- Added an error if an incorrect flag is used.
- Slightly changed the format of the default config file.

### `@liveblocks/client`

- Internal refactorings.

# v1.0.7

- Private API changes only.

# v1.0.6

## Internal changes

- Release `create-liveblocks-app` along with other Liveblocks packages, using
  the same versioning scheme.
- Internal refactorings.

# v1.0.5

Non-existent.

# v1.0.4

Non-existent.

# v1.0.3

Non-existent.

# v1.0.2

- Fix bug where passing down `shouldInitiallyConnect` connection option would
  not always work.

# v1.0.1

- Log stack traces of function calls that resulted in rejected storage mutations
  to the console in non-production builds to ease debugging.

### `@liveblocks/client`

- Fixes bug where the state of `others` in a room was wrong when:
  - Client A disconnects improperly (ex: computer goes to sleep)
  - Then Client B disconnects (ex: computer goes to sleep)
  - Then Client A reconnects: client B still shows in the `others` state

# v1.0.0

This major release marks the maturity of Liveblocks. For upgrade instructions,
see the [1.0 upgrade guide](https://liveblocks.io/docs/guides/upgrading/1.0).

## `@liveblocks/node`

`authorize` option `userId` is now mandatory.

Our new [pricing](https://liveblocks.io/pricing) is based on Monthly Active
Users instead of connections. We're using `userId` to track MAU associated to a
Liveblocks account.

# v0.19.11

## `@liveblocks/node`

- `WebhookHandler` now handles `RoomCreatedEvent` and `RoomDeletedEvent`

# v0.19.10

## `@liveblocks/client`

- Allow
  [`createClient`](https://liveblocks.io/docs/api-reference/liveblocks-client#createClientThrottle)
  `throttle` option to go as low as 16ms.

# v0.19.9

## `@liveblocks/client`

- Adds a `WebhookHandler` class
  - `new WebhookHandler(secret).verifyRequest({ rawBody, headers })` can be used
    to verify event requests from Liveblock's Webhook functionality. It also
    provides fully typed `WebhookEvents`.
  - Check out our [Webhooks guide](https://liveblocks.io/docs/guides/webhooks)
    for more details

# v0.19.8

- Fixes a bug where history didn't reliably undo `LiveObject` key set changes if
  any pending local changes existed on that key.
- Fixes a bug where changes performed inside `room.batch` were incorrectly
  ordered inside the history resulting in unexpected undo behavior in some
  cases.
- Fixes a bug where under some circumstances the Liveblocks client could get
  stuck in a "synchronizing" state indefinitely
- Expose `JsonArray` and `JsonScalar` types publicly

# v0.19.7

Fix nested storage event handling issue.

# v0.19.6

Support authentication with cookies.

# v0.19.5

Export the `StorageStatus` type (introduced with 0.19.3).

# v0.19.4

Fix CORS issue.

# v0.19.3

In **@liveblocks/client**:

## Room.getStorageStatus

Get the storage status.

- `not-loaded`: Initial state when entering the room.
- `loading`: Once the storage has been requested via room.getStorage().
- `synchronizing`: When some local updates have not been acknowledged by
  Liveblocks servers.
- `synchronized`: Storage is in sync with Liveblocks servers.

## Room.subscribe("storage-status", status => { })

Subscribe to storage status changes.

Returns an unsubscribe function.

```typescript
room.subscribe("storage-status", (status) => {
  switch (status) {
    case "not-loaded":
      break;
    case "loading":
      break;
    case "synchronizing":
      break;
    case "synchronized":
      break;
    default:
      break;
  }
});
```

## Room.reconnect

Close the room connection and try to reconnect.

## Internal changes

- Add support for the upcoming Liveblocks browser extension

# v0.19.2

Fixes some internal type definitions.

# v0.19.1

Fixes an issue where `import`s from Liveblocks packages could not be resolved
correctly in certain build environments.

# v0.19.0

This release brings Zustand v4 support. This is a breaking change **only if
you’re using @liveblocks/zustand**.

In **@liveblocks/zustand**:

- Support Zustand v4 (actually v4.1.3 or higher)
- Drop support for Zustand v3 (also v4.1.2 or lower are not supported)
- Fix bug where some usage pattern could cause the Zustand store to stop
  synching (#491)

To migrate, make the following code changes:

- `npm install zustand@latest`
- `npm install @liveblocks/zustand@latest`
- Change these imports, if applicable:
  ```diff
  -import { middleware } from "@liveblocks/zustand";
  +import { liveblocks } from "@liveblocks/zustand";
  ```
  and
  ```diff
  -import type { LiveblocksState } from "@liveblocks/zustand";
  +import type { WithLiveblocks } from "@liveblocks/zustand";
  ```
  and rename accordingly.
- Change the pattern:
  ```ts
  create(liveblocks<MyState, ...>(...))
  ```
  to the Zustand v4 recommended pattern:
  ```ts
  create<WithLiveblocks<MyState, ...>>()(liveblocks(...))
  ```
  To be clear:
  1.  First, move the type annotation away from the `liveblocks` middleware
      call, and onto the `create` call.
  2.  Next, wrap your `MyState` type in a `WithLiveblocks<...>` wrapper. This
      will make sure the injected `liveblocks` property on your Zustand state
      will be correctly typed.
  3.  Finally, make sure to add the extra call `()` wrapper, needed by Zustand
      v4 now:
      ```ts
      create<WithLiveblocks<MyState, ...>>()(liveblocks(...))
      //                                  ^^ Not a typo
      ```
- Remove the second argument to `state.liveblocks.enterRoom()`: it no longer
  takes an explicit initial state. Instead, it's automatically be populated from
  your Zustand state.

In **@liveblocks/redux**:

- The main export has been renamed:
  ```diff
  -import { enhancer } from "@liveblocks/redux";
  +import { liveblocksEnhancer } from "@liveblocks/redux";
  ```
- The second argument to `state.liveblocks.enterRoom()` to send in an explicit
  initial state is no longer supported. It will use the state in your Redux
  store, for consistency and ease of use.

# v0.18.5

Bug fix:

- Fixes a small bug in a type definition, `scopes` was removed from
  `BaseUserMeta`.

Internal updates:

- Switch the monorepo over to Turborepo.

# v0.18.4

All packages now provide an `isReadOnly` flag on user instances. It is available
when getting self or others. `isReadOnly` is true when storage is read-only, see
the
[room management guide](https://liveblocks.io/docs/guides/managing-rooms-users-permissions#permissions)
for more information.

```ts
const me = room.getSelf();

me.isReadOnly; // boolean

const others = room.getOthers();
for (const other of others) {
  other.isReadOnly; // boolean
}
```

In **@liveblocks/client**:

- Add a new option `shouldInitiallyConnect` to `client.enter` that let you
  control whether or not the room connects to Liveblocks servers. Default is
  `true`.

  Usually set to false when the client is used from the server to not call the
  authentication endpoint or connect via WebSocket.

In **@liveblocks/react**:

- Add a new property `shouldInitiallyConnect` to `RoomProvider` that let you
  control whether or not the room connects to Liveblocks servers. Default is
  `true`.

  By default equals to `typeof window !== "undefined"`, meaning the RoomProvider
  tries to connect to Liveblocks servers only on the client side.

- Internal package restructurings to increase code sharing. You may notice a new
  dependency show up in your dependency tree: `@liveblocks/core`. It contains
  private APIs that aren't intended for direct consumption.

# v0.18.3

- In **@liveblocks/react**:

  Fixes the "zombie-child" problem that can occur with React 17 or lower. **If
  you’re on React 18: great, you can ignore this!** If you’re using React 17 or
  lower with Liveblocks, we’ll now start to enforce that you pass the
  `unstable_batchedUpdates` prop to RoomProvider, so this problem can be
  circumvented. This small addition may save you hours of debugging time!

  ```tsx
  // ⚠️  Only if you’re using React 17 or lower
  import { unstable_batchedUpdates } from "react-dom";  // 👈

  <RoomProvider
    id="my-room"
    initialPresence={...}
    initialStorage={...}
    unstable_batchedUpdates={unstable_batchedUpdates}  // 👈
  >
    <App />
  </RoomProvider>
  ```

  To read more, see
  https://liveblocks.io/docs/guides/troubleshooting#stale-props-zombie-child

- In **@liveblocks/zustand**:

  - Fix a confusing error message

# v0.18.2

- In **@liveblocks/react**:

  - Make sure that `useOther` will not rerender if tracked users already left
    the room, so that child components won't get rerendered before the parent
    got the chance to unmount them.
  - Disallow `useOther` without selector

# v0.18.1

- In **@liveblocks/react**:

  - Fix a bug that could cause an error when patching presence during local
    development. Not an issue in production builds. (#505)

# v0.18.0

For information, please read our
[Upgrade Guide for 0.18](https://liveblocks.io/docs/guides/upgrading/0.18).

### New React hooks ✨

- In **@liveblocks/react**:

  - [`useStorage`](https://liveblocks.io/docs/api-reference/liveblocks-react#useStorage)
  - [`useMutation`](https://liveblocks.io/docs/api-reference/liveblocks-react#useMutation)
  - [`useSelf`](https://liveblocks.io/docs/api-reference/liveblocks-react#useSelf)
  - [`useOthers`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthers)
  - [`useOthersMapped`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthersMapped)
  - [`useOthersConnectionIds`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOthersConnectionIds)
  - [`useOther`](https://liveblocks.io/docs/api-reference/liveblocks-react#useOther)
    (singular)

- In **@liveblocks/client**:

  - New
    [`.toImmutable()`](https://liveblocks.io/docs/api-reference/liveblocks-client#LiveObject.toImmutable)
    method on `LiveObject`, `LiveList`, and `LiveMap` lets you work with an
    immutable representation of the storage objects
  - Improved core performance
  - Reduced bundle size
  - Others only become visible in the `others` array if their presence is known

### Breaking changes

- Remove support for directly importing hooks from **@liveblocks/client** (e.g.
  `import { useMyPresence } from '@liveblocks/react'`). If you’re still using
  these imports, see the
  [Upgrade Guide for 0.17](https://liveblocks.io/docs/guides/upgrading/0.17) for
  instructions.
- Remove `ClientProvider` and `useClient` hook
- Remove `defaultPresence` and `defaultStorageRoot` arguments. (Just use
  `initialPresence` and `initialStorage` arguments now.)
- Remove second argument to `useMap()`, `useList()`, and `useObject()`.
- Remove `new LiveMap(null)` support. (Just use `new LiveMap()` or
  `new LiveMap([])`.)

# v0.17.11

General:

- Fix a packaging bug

In **@liveblocks/react**:

- Deprecate an undocumented API

# v0.17.9

- Fix bug that could cause duplicate copies of @liveblocks/client to end up in
  final bundle, for certain bundler configurations.
- Fix bug where in some conditions the initial presence for a new connection
  would not come through to all existing clients in the room
- Various internal changes

# v0.17.8

### New history APIs ↩️ ↪️

- In **@liveblocks/client**:

  - Add `canUndo()` and `canRedo()` utilities to `room.history`
  - Add `"history"` event type to `room.subscribe()` to subscribe to the current
    user's history changes

- In **@liveblocks/react**:

  - Add `useCanUndo()` and `useCanRedo()` hooks

# v0.17.7

- In **@liveblocks/zustand**:

  - Simplify zustand middleware integration with Typescript. `TPresence`,
    `TStorage`, `TUserMeta`, and `TRoomEvent` are now optional.

Note that `@liveblocks/zustand` does not work with zustand > v4 because v3 and
v4 have completely different type definitions. As soon as zustand v4 is out of
the RC phase, we will consider updating our middleware to work with the latest
version.

### Example

Let's take a look at our
[To-do list](https://github.com/liveblocks/liveblocks/tree/main/examples/zustand-todo-list)
example. Without our middleware, the store would look like this:

```ts
import create from "zustand";

type State = {
  draft: string;
  isTyping: boolean;
  todos: Todo[];
  setDraft: (draft: string) => void;
  addTodo: () => void;
  deleteTodo: (index: number) => void;
};

create<State>(/* ... */);
```

With our middleware, you simply need to move the `State` param at the middleware
level:

```ts
import create from "zustand";
import { createClient } from "@liveblocks/client";
import { middleware } from "@liveblocks/zustand";

const client = createClient({ /*...*/ });

type State = {
  draft: string;
  isTyping: boolean;
  todos: Todo[];
  setDraft: (draft: string) => void;
  addTodo: () => void;
  deleteTodo: (index: number) => void;
};

create(
  middleware<State>(/* ... */, {
    client,
    presenceMapping: { isTyping: true },
    storageMapping: { todos: true }
  })
);
```

If you want to type `others` presence, you can use the `TPresence` generic
argument on the middleware.

```ts

type Presence = {
  isTyping: true;
}

const useStore = create(
  middleware<State, Presence>(/* ... */, {
    client,
    presenceMapping: { isTyping: true },
    storageMapping: { todos: true }
  })
);

// In your component
useStore(state => state.liveblocks.others[0].presence?.isTyping)
```

# v0.17.6

- In **@liveblocks/react**:

  - Expose `RoomContext` in the return value of `createRoomContext()`

# v0.17.5

- In **@liveblocks/react**:

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

# v0.16.17

Fix bug in internal code where some legal authentication tokens would be
considered invalid.

# v0.16.16

Internals only.

# v0.16.15

Internals only.

# v0.16.14

Fix an issue where the current user's info would not properly display accented
characters.

# v0.16.13

(Unpublished.)

# v0.16.12

Internals only.

# v0.16.11

Expose helper type to help users adopt to using Live structures with interfaces
they don't own.

# v0.16.10

Restructures a few more internals.

# v0.16.9

Restructures a few internals.

# v0.16.8

Fix bug in private/internal code.

# v0.16.7

Fix bug in private/internal code.

# v0.16.6

Fix bug in example code suggested in deprecation warning.

# v0.16.5

### All packages

- Various internal refactorings

### Bug fixes

- In **@liveblocks/client**:

  - If you're using `@liveblocks/client` in a ES2015 context, you no longer have
    to polyfill `Object.fromEntries()`.

# v0.16.4

### All packages

- Improve our generated bundles. They are now even more tree-shakable, and
  smaller!
- Some APIs are being deprecation and will show warnings in the dev console when
  used

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

# v0.16.2

### Bug fixes

- In **@liveblocks/client**:

  - Fix small bug related to new `JsonObject` type, which would reject some
    values that were legal JSON objects.

# v0.16.1

### Bug fixes

- In **@liveblocks/react**:

  - Fix issue with React 18 and StrictMode.

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
