# Storage demo

Proof that **`@liveblocks/storage`** can sync over the real Liveblocks Room protocol — without going through `@liveblocks/client`.

Mutate a shared `LiveList` in the browser; a thin bridge (`src/sync/roomClient.ts`) hydrates a `StorageDoc`, sends ops on subscribe, and applies inbound/ack ops.

## Run

```bash
cd e2e/storage-demo
pnpm install --ignore-workspace   # required (see note below)
pnpm dev
```

- UI: http://localhost:3010  
- Open **two tabs** → add / reorder / remove — should sync

After changing `packages/liveblocks-storage`, rebuild that package so the demo picks it up.

> Install with `--ignore-workspace` so the server can use LiveText-capable `@liveblocks/core` from `@liveblocks/server` (workspace core is older).

## Layout

| Path | Role |
|------|------|
| `packages/liveblocks-storage` | CRDTs + `StorageDoc` |
| `server/` | `@liveblocks/server` Room + `ws` |
| `src/sync/roomClient.ts` | Protocol ↔ StorageDoc |
| `src/App.tsx` | Shared list UI |
