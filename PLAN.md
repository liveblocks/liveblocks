# Branch: `add-tojson` follow-ups

## XXX comments from this branch

- [ ] **Undo frames on init** (`zustand/index.ts:228`, `redux/index.ts:264`): Initial storage seeding adds to the undo stack but shouldn't. Wrap in `withoutUndo()` once available.
- [ ] **Presence update outside batch** (`zustand/index.ts:289`, `redux/index.ts:154`): `updatePresence` is called outside `room.batch()` — investigate if this is intentional.
- [ ] **Remove `.toObject()` / `.toArray()` entirely?** (`LiveObject.ts:519`, `LiveList.ts:1102`): Evaluate how bad it would be to remove instead of deprecate — will need to update examples and docs.

## Remaining API tasks

- [ ] Rename test `"lo.reconcile(obj, config).toImmutable() === obj"` → use `.toJSON()` in description
- [ ] Write upgrade guide for 3.17 (`.toImmutable()` → `.toJSON()`, `useStorage` changes, `Map` → plain object for LiveMaps)
- [ ] Publicly document `LiveObject.from(obj)` and `LiveObject.reconcile(obj)` signatures
- [ ] Decide: export `reconcilePartially` from core/client?

## Adopt new API across the codebase

- [ ] Migrate remaining `.toImmutable()` calls in examples (`nextjs-whiteboard-advanced`, `nextjs-react-flow-ai`, etc.)
- [ ] Migrate remaining `.toImmutable()` calls in e2e test apps (`next-sandbox`, etc.)
- [ ] Migrate remaining `.toImmutable()` calls in core test files (devserver tests, mockserver tests, e2e utils)
- [ ] Check for any remaining `Map` API usage on `useStorage` results (`.size`, `.entries()`, `.get()`, etc.)

## Manual testing

- [ ] Re-test all Zustand examples + e2e apps
- [ ] Re-test all Redux examples + e2e apps
- [ ] Re-test React Flow example + e2e app
- [ ] Run full e2e suite headlessly: `npx turbo build && env HEADLESS=1 playwright test --retries=5`
