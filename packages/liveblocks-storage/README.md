# `@liveblocks/storage`

Experimental package: Liveblocks Storage CRDTs **without** Room networking.

> Not wired into `@liveblocks/client` yet. Demo: `e2e/storage-demo`.

## Vision

Same split Y.js uses — **document/types vs transport**:

| `@liveblocks/storage` | Room / client |
|-----------------------|---------------|
| `LiveObject`, `LiveList`, `LiveMap`, … | WebSocket, auth, presence |
| `StorageDoc` (ids, pending, subscribe / apply) | Send / receive ops |
| Mutate like normal classes | One possible sync consumer |

Today those CRDTs live inside `@liveblocks/core` and are tightly coupled to Room via `ManagedPool`. This package extracts them behind a small doc API so Storage can run offline, in tests, or behind a custom sync layer — Room becomes a listener, not the owner of the tree.

```ts
const doc = new StorageDoc({ getActorId: () => actorId });
const root = new LiveObject({ items: new LiveList([]) });
doc.attach(root, "root");

doc.subscribe(({ ops }) => socket.send(ops)); // Room, or anything else
doc.apply(remoteOps);                         // inbound / acks

root.get("items").push("hello");
```

**Sync pattern:** hydrate (`fromNodes`) → local edits emit ops → remotes `apply` without `opId` → acks `apply` with `opId`.

## Status

- ✅ Standalone package + unit tests
- ✅ E2E demo syncing a `LiveList` over real `@liveblocks/server` Room protocol
- ❌ Not yet the source of truth for production client/Room
- ❌ `LiveText` not included yet
