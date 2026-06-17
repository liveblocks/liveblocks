# Plan — `nextjs-ai-spreadsheet`

> Temporary planning doc. Deleted before the final PR (examples don't ship a PLAN.md).

A realtime, multiplayer **AI spreadsheet** merging three existing examples:

- `nextjs-multiplayer-handsontable` — Handsontable + Liveblocks Storage editable grid, presence selection.
- `nextjs-comments-handsontable` — per-cell comment threads (`FloatingComposer`/`FloatingThread`/`CommentPin`).
- `nextjs-ai-elements-realtime` — Feeds-based multiplayer AI chat (Tailwind + shadcn `components/ui/*` + `components/ai-elements/*`), server route streaming into a feed via `@liveblocks/node`.

Reference for AI-edits-Storage-with-presence: `nextjs-linear-like-issue-tracker` (`lib/apply-issue-property-updates.ts`, `lib/ai-remote-presence.ts`) — uses `liveblocks.mutateStorage()` + `liveblocks.setPresence({ userId, userInfo, data, ttl })`.

## Decisions (locked with user)

- Tailwind; copy shadcn/ai-elements components from the realtime example (no shadcn CLI).
- Layout: full-height. Row 1 = Excel-like toolbar (full width). Row 2 = spreadsheet (flex-1, AvatarStack strip) | collapsible ~380px AI chat panel.
- **Stable-id Storage model** (everyone shares one order/state):
  ```ts
  Storage: {
    rowIds: LiveList<string>;
    colIds: LiveList<string>;
    cells: LiveMap<string, LiveObject<{ value: string; format?: CellFormat }>>; // key `${rowId}:${colId}`, SPARSE
    colWidths: LiveMap<string, number>;  // by colId
    rowHeights: LiveMap<string, number>; // by rowId
  }
  CellFormat = { bold?; italic?; underline?; strike?; align?: "left"|"center"|"right"; color?; background?; numberFormat?: "general"|"currency"|"percent" }
  Presence: { selectedCell: { rowId; col: string } | null; promptingFeedId: string | null } // selectedCell uses {rowId, colId}
  ThreadMetadata: { rowId: string; colId: string }
  UserMeta: { id; info: { name; color; avatar } }
  FeedMessageData / FeedMetadata: as realtime example.
  ```
- Initial size 100 rows × 52 cols (A–AZ). Seed a small sample table (bold+filled headers + a few rows) via `initialStorage`; rest sparse.
- Reordering all SHARED, persisted to id lists; Handsontable kept as a pure projection (reset its internal index map after persisting; guard against re-entrancy). Row move = priority; col move; sort by column (lower priority); insert/delete row & col (clean orphaned cells on delete); resize by id.
- Comments keyed by `{rowId,colId}`, merged into the single React cell renderer; toolbar "+ Comment" + in-cell hover affordance.
- AI chat: Feeds, multiplayer, new-chat + history dropdown. Server route streams assistant text via `updateFeedMessage` AND runs AI SDK v6 `streamText` with tools; each tool `execute` writes Storage via `mutateStorage` immediately (no artificial delay) + `setPresence` (AI user, ttl) so its selection hops cell-to-cell live. NO mock fallback — requires `AI_GATEWAY_API_KEY`.
- Tools (model speaks A1; server translates A1→position→ids): `getSpreadsheet`, `setCellValue`, `setRangeValues`, `clearRange`, `formatCells`, `sortByColumn`, `insertRow`, `insertColumn`, `deleteRow`, `deleteColumn`, `addComment`.
- AI identity in `database.ts` (name "Liveblocks AI"). No formulas.

## Rendering / reconciliation approach

- Build Handsontable `data` as `rowIds.map(r => colIds.map(c => cells[`${r}:${c}`]?.value ?? ""))`.
- Use a **React-component cell renderer** (the react-wrapper supports React renderers, as the comments example proves — it uses hooks/context in `CommentCell`). One `Cell` component reads from table-level contexts (single subscriptions): cell value+format, others'/AI presence by cell, threads by cell. It renders the styled value, presence box-shadow borders, and the comment pin/composer/thread.
- A1 helpers: `colIndexToLetters`, `lettersToColIndex`, `a1ToRowCol`, shared by toolbar/AI.

## File tree

```
examples/nextjs-ai-spreadsheet/
  .env.example .gitignore .prettierrc .envrc vercel.json README.md
  next.config.ts tsconfig.json postcss.config.mjs components.json package.json
  liveblocks.config.ts database.ts example.ts
  lib/utils.ts lib/a1.ts lib/format.ts
  hooks/use-example-room-id.ts
  components/ui/*           (copied from realtime)
  components/ai-elements/*  (copied from realtime)
  components/HelpButton.tsx (adapted)
  app/globals.css app/layout.tsx app/Providers.tsx app/page.tsx
  app/Spreadsheet.tsx       (toolbar + table + chat layout)
  app/Toolbar.tsx
  app/Table.tsx
  app/Cell.tsx
  app/CellContexts.tsx      (cells/presence/threads contexts + selection state)
  app/Chat.tsx              (adapted from realtime)
  app/api/liveblocks-auth/route.ts
  app/api/users/route.ts
  app/api/users/search/route.ts
  app/api/ai-chat/route.ts  (streamText + tools + mutateStorage + setPresence)
  app/api/ai/spreadsheet.ts (server storage helpers: A1↔id, mutate, presence)
```

## Phases

1. Scaffold: package.json, configs, globals, layout, Providers, auth/users routes, database, example.ts, lib, hooks, env, README stub.
2. Copy `components/ui/*`, `components/ai-elements/*`, HelpButton.
3. liveblocks.config.ts + Room/initialStorage + projection + a1/format helpers.
4. Table.tsx + Cell.tsx + CellContexts.tsx: projection, renderer (format+presence), selection→presence, resize, move/sort/insert/delete.
5. Toolbar.tsx wired to selection + Storage mutations + undo/redo + comment.
6. Comments integration in Cell + toolbar.
7. Chat.tsx ported (new chat + history).
8. AI route + server spreadsheet helpers + tools.
9. UI polish (ui-ux-pro-max + make-interfaces-feel-better).
10. Typecheck/build (`cd examples/nextjs-ai-spreadsheet && npm install && npx tsc --noEmit && npm run build`), conformance, debug, code review.
11. README, delete PLAN.md, commit/push, PR.

## Risks
- Handsontable index-map drift on move/sort → persist + reset sequence + re-entrancy guard.
- Sparse cell cleanup on clear/delete.
- Presence re-render perf at 100×52 → contexts + viewport virtualization.
- Feeds + Storage in one room (fine; independent).
- A1 columns beyond Z (AA..AZ) → robust base-26 helpers.
- React renderer + Liveblocks hooks/context inside Handsontable cells (validated by comments example).
