# Liveblocks docs product and Sync redesign

Date: 2026-07-30

## Goal

Reorganize the Liveblocks documentation around Products, with Sync as the
primary product. Separate short product landing pages from detailed product
overviews, add focused Sync and Feeds documentation, add application-oriented
Use cases, and preserve every moved URL in a redirect ledger for the
`liveblocks.io` repository.

## Terminology

- **Sync** is the hosted Liveblocks sync-engine product.
- **Storage** is the persistent conflict-free data model inside Sync.
- Exact public API names do not change. Keep identifiers such as `Storage`,
  `useStorage`, `LiveObject`, `storageUpdated`, and `/storage/json-patch`.
- Use **Sync** when naming the product. Use **Storage** when describing the data
  model or exact APIs.
- **LiveText** is a Storage data type for collaborative rich text. This docs
  change depends on the LiveText release currently represented by
  `origin/livetext` landing first. Its canonical client API is `LiveText` from
  `@liveblocks/client`, documented at
  `/docs/api-reference/liveblocks-client#LiveText`.
- The same prerequisite release supplies `@liveblocks/codemirror`,
  `@liveblocks/prosemirror`, `@liveblocks/lexical`, and the LiveText-backed
  `collaborationMode: "liveblocks"` path in `@liveblocks/react-tiptap`.
- LiveText is the recommended foundation for new text-editor integrations. Yjs
  remains available for existing Yjs ecosystems and use cases that need Yjs
  shared types or providers.
- Sync is not Resync, open source, or self-hostable. Do not use `resync/*`,
  `createServer`, `serverUrl`, custom persistence adapters, or self-hosting
  claims.

## Navigation

The documentation homepage remains at `/docs`. Rename its sidebar entry from
“Overview” to “Home”.

The primary sidebar order is:

1. Existing unlabelled introductory group
2. Products
3. Use cases
4. Platform
5. Pricing
6. Tools
7. Integrations
8. Upgrading
9. API Reference

Default state changes:

- Integrations: collapsed
- Platform: open
- Tools: open
- API Reference: open
- All other sections retain their current state

### Products

```text
Products
├── Sync
│   ├── Overview
│   ├── Data types
│   ├── Conflict resolution
│   ├── Multiplayer undo/redo
│   ├── Presence
│   ├── Agentic editing
│   ├── Version history
│   ├── Broadcast events
│   ├── Authentication and permissions
│   ├── Integrations
│   └── Yjs
├── Feeds
│   ├── Overview
│   ├── Chat interfaces
│   ├── Listing feeds
│   ├── Pagination
│   ├── Integrating workflows
│   └── Authentication and permissions
├── Comments
│   ├── Overview
│   ├── Concepts
│   └── Existing Comments pages
├── Notifications
│   ├── Overview
│   ├── Concepts
│   └── Existing Notifications pages
└── AI Copilots
    └── Existing AI Copilots pages
```

Product root pages are deliberately short:

- One concise description
- A video only when an approved existing asset is named in this specification
- Links to the product’s overview and other primary pages

Detailed product explanations live at `/overview`.

AI Copilots is explicitly exempt from this new product-root template. Its
existing root and child pages move to `/products/ai-copilots` without a content
redesign.

### Use cases

```text
Use cases
├── Canvas
├── Code editor
├── Text editor
├── Flowchart
├── AI Collaboration
├── Spreadsheet
└── Table
```

Use-case pages explain the minimum useful Liveblocks stack, show short snippets,
and link to the relevant get-started guide, API reference, guides, and examples.
They are not step-by-step tutorials.

## Page designs

### Homepage

Keep the visual homepage at `/docs`, but:

- Rename “Collaboration features” to “Products”.
- Link product cards to the new product roots.
- Put Sync first and make its description the primary message.
- Add or update Use case cards for the seven approved use cases.
- Keep API reference, examples, and community sections.

### Sync landing

Route: `/docs/products/sync`

- One paragraph defining Sync.
- Use the existing `/assets/tutorials/whiteboard/tutorial-whiteboard.mp4`
  multiplayer whiteboard video.
- Link cards for Overview, Data types, Presence, Agentic editing, Version
  history, Integrations, and Yjs.
- A prominent get-started banner.

### Sync overview

Route: `/docs/products/sync/overview`

Write the overview directly from the requirements below. Do not depend on an
external draft or attachment. The opening must define Sync as Liveblocks’ hosted
sync engine for collaborative applications and name representative surfaces:
documents, human/agent Presence, text editors, canvases, flowcharts,
spreadsheets, and tables.

Sections:

1. What Sync is
2. Feature summary
3. What a sync engine does
4. When to use Sync
5. How hosted Liveblocks Sync works
6. Rooms, documents, Storage, and Presence
7. Optimistic updates
8. Where data lives
9. Next steps

Use existing Liveblocks snippets:

- `LiveblocksProvider`
- `RoomProvider`
- `useStorage`
- `useMutation`
- `useOthers`
- `useUpdateMyPresence`

Link to:

- `/docs/get-started`
- `/docs/products/sync/data-types`
- `/docs/products/sync/presence`
- `/docs/products/sync/conflict-resolution`
- `/docs/authentication`
- `@liveblocks/react` and `@liveblocks/client` API anchors

Suggested videos:

- Human and agent editing the same artifact
- A two-window optimistic counter or canvas update

These are production recording briefs only. Do not render missing media,
placeholder components, TODO comments, or broken asset paths in this change.

### Sync data types

Route: `/docs/products/sync/data-types`

Explain how to choose and combine:

- `LiveObject`
- `LiveList`
- `LiveMap`
- `LiveFile`
- `LiveText`

Cover nesting, JSON-compatible values, immutable snapshots, large files, and
typing. Include a compact decision table and snippets. Link every type to its
`@liveblocks/client` API section.

LiveText is included as an available Storage data type. Explain that editor
packages adapt it to different text editors.

### Sync conflict resolution

Route: `/docs/products/sync/conflict-resolution`

Explain:

- Why concurrent writes conflict
- How conflict-free data types preserve changes
- Behavior for atomic values, objects, maps, lists, and LiveText
- Offline/reconnection behavior
- Designing a document to minimize surprising overwrites

Use diagrams or short scenarios rather than implementation internals.

### Sync multiplayer undo/redo

Route: `/docs/products/sync/multiplayer-undo-redo`

Explain per-user history, why remote changes are not undone, pausing/resuming
history, batching drag operations, and optionally including Presence. Link to
`useUndo`, `useRedo`, `useCanUndo`, `useCanRedo`, `useHistory`, and
`Room.history`.

Suggested video: two users edit shapes; one user undoes only their changes.

### Sync Presence

Route: `/docs/products/sync/presence`

Explain ephemeral per-connection state, suitable data, reset behavior,
throttling, humans and agents, and common UI patterns. Use
`useMyPresence`/`useUpdateMyPresence`, `useOthers`, and `useSelf`.

Suggested video: cursors, avatar stack, selections, and AI-agent presence.

### Sync agentic editing

Route: `/docs/products/sync/agentic-editing`

Explain server and AI editing with:

- Node APIs
- Storage JSON Patch
- Ephemeral Presence for agents
- Webhooks for follow-up work
- Validation and permissions

Include a “Create a version first” section that recommends creating or retaining
a version before an agent applies a substantial change, and links to Version
history.

### Sync version history

Route: `/docs/products/sync/version-history`

Explain when versions are useful, listing, previewing, restoring, deleting, and
how restoration interacts with undo. Link to:

- `useHistoryVersions`
- `useHistoryVersionStorageData`
- `useHistoryVersionYjsData`
- `useRestoreToStorageVersion`
- `useDeleteHistoryVersion`
- Existing version-history guide

Suggested video: preview and restore a document version.

### Sync broadcast events

Route: `/docs/products/sync/broadcast-events`

Explain transient room events, delivery behavior, typing, sending/listening, and
when not to use broadcasts. Include:

- A simple `useBroadcastEvent` / `useEventListener` snippet
- An SWR revalidation example and link to the existing guide
- Examples such as media controls, confetti, and invalidating server data

### Sync authentication and permissions

Route: `/docs/products/sync/authentication-and-permissions`

Explain public-key prototyping, ID-token production authentication, room
permissions, `storage:read`, `storage:write`, and read-only experiences. Link to
the canonical Authentication and Permissions pages rather than duplicating their
setup.

### Sync integrations

Route: `/docs/products/sync/integrations`

One page listing all Sync integrations; it has no sidebar children. Group by:

- Text editors and code editors
- Canvas and flowchart libraries
- State management
- Yjs ecosystem

Include Tiptap, BlockNote, Lexical, CodeMirror, ProseMirror, React Flow,
Zustand, Redux, and Yjs as supported by available packages. Each entry links to
a use case, get-started guide, and API reference where available.

### Sync Yjs

Route: `/docs/products/sync/yjs`

Yjs is the final item in the Sync sidebar. Move and update the existing Yjs
page. Add a prominent banner:

- For new text-editor integrations, recommend LiveText.
- Link to `/docs/use-cases/text-editor`.
- Explain when Yjs is still the right choice.

Keep Yjs setup, awareness, subdocuments, offline support, guides, API links, and
examples.

### Feeds landing

Route: `/docs/products/feeds`

Short paragraph, get-started banner, and links to all Feeds pages. There is no
approved Feeds video asset in this repository, so this change must not render a
video or placeholder.

Future recording brief: a user sends a message, a workflow processes it, and
messages stream back into two connected clients.

### Feeds overview

Route: `/docs/products/feeds/overview`

Explain what Feeds are good for and summarize:

- Realtime ordered message lists
- Custom message data and feed metadata
- Client and server creation
- Listing and filtering feeds
- Pagination
- Realtime updates
- Workflow integration
- Chat and agent interfaces

Link to the Next.js Feeds get-started guide and React, Client, Node, REST, and
Python API references.

### Feeds chat interfaces

Route: `/docs/products/feeds/chat-interfaces`

Summarize the architecture of a chat interface without becoming a tutorial. Use
a compact `useFeedMessages` and `useCreateFeedMessage` example. Cover optimistic
UI, loading older messages, message roles, IDs, and server-generated responses.

### Feeds listing feeds

Route: `/docs/products/feeds/listing-feeds`

Use `useFeeds` to list feeds. Cover metadata, timestamp filters, sorting, empty
states, and linking to a selected feed.

### Feeds pagination

Route: `/docs/products/feeds/pagination`

Cover pagination for both `useFeeds` and `useFeedMessages`, including
`fetchMore`, `hasFetchedAll`, `isFetchingMore`, and error states.

### Feeds integrating workflows

Route: `/docs/products/feeds/integrating-workflows`

Show how back-end jobs, AI agents, n8n, and other workflow engines create feeds
and append/update messages. Link Node, REST, Python, n8n, and agentic-workflow
documentation.

### Feeds authentication and permissions

Route: `/docs/products/feeds/authentication-and-permissions`

Explain that Feeds are room resources, how room access gates clients, when
server APIs use a secret key, and how IDs and metadata should be validated. Link
to canonical authentication and permissions docs.

### Comments and Notifications

For each product:

- Keep the product root as a concise landing/index.
- Add `/overview` immediately before `/concepts` in the sidebar.
- Overview explains what the product is, when to use it, feature summary,
  minimal snippet, get-started banner, APIs, guides, examples, and suggested
  video.
- Concepts remains the data-model and behavior detail page.

There are no approved new Comments or Notifications video assets for these
overviews. Do not render missing media or placeholders. The existing
Notifications batching video remains on the Concepts page.

### AI Copilots

Move the existing tree to `/products/ai-copilots` without redesigning its
content in this change, except for updated parent titles and links.

### Use-case page contract

Every use-case page contains:

1. What the application surface is
2. Recommended Liveblocks products and SDKs
3. One short representative snippet
4. A get-started banner
5. Relevant guides
6. Relevant examples
7. Direct API links
8. Optional video suggestion

Specific focus:

- **Canvas**: Sync Storage, Presence, undo/redo, Comments
- **Code editor**: LiveText or Yjs, Presence, Comments, CodeMirror/Monaco
- **Text editor**: LiveText preferred, Tiptap/BlockNote/Lexical/ProseMirror,
  Comments, Notifications, AI Copilots; the old editor feature pages consolidate
  here
- **Flowchart**: `@liveblocks/react-flow`, Sync Storage, Presence, Comments, AI
- **AI Collaboration**: Feeds, Sync agentic editing, Presence, Comments,
  Notifications, AI Copilots
- **Spreadsheet**: Sync Storage, Presence, undo/redo, Comments, AI
- **Table**: Comments, Notifications, optional Presence and Sync

## Redirect ledger

Copy this table into the eventual PR description and create matching redirects
in the `liveblocks.io` repository. Paths are shown without the `/docs` prefix
because `docs/routes.json` uses that form.

| Old path                                                             | New path                                            |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| `/collaboration-features/multiplayer`                                | `/products/sync`                                    |
| `/collaboration-features/multiplayer/text-editor`                    | `/use-cases/text-editor`                            |
| `/collaboration-features/multiplayer/text-editor/tiptap`             | `/use-cases/text-editor`                            |
| `/collaboration-features/multiplayer/text-editor/blocknote`          | `/use-cases/text-editor`                            |
| `/collaboration-features/multiplayer/text-editor/lexical`            | `/use-cases/text-editor`                            |
| `/collaboration-features/multiplayer/sync-engine`                    | `/products/sync`                                    |
| `/collaboration-features/multiplayer/sync-engine/liveblocks-yjs`     | `/products/sync/yjs`                                |
| `/collaboration-features/multiplayer/sync-engine/liveblocks-storage` | `/products/sync/overview`                           |
| `/collaboration-features/comments`                                   | `/products/comments`                                |
| `/collaboration-features/comments/concepts`                          | `/products/comments/concepts`                       |
| `/collaboration-features/comments/users-and-mentions`                | `/products/comments/users-and-mentions`             |
| `/collaboration-features/comments/default-components`                | `/products/comments/default-components`             |
| `/collaboration-features/comments/hooks`                             | `/products/comments/hooks`                          |
| `/collaboration-features/comments/metadata`                          | `/products/comments/metadata`                       |
| `/collaboration-features/comments/primitives`                        | `/products/comments/primitives`                     |
| `/collaboration-features/comments/styling-and-customization`         | `/products/comments/styling-and-customization`      |
| `/collaboration-features/comments/email-notifications`               | `/products/comments/email-notifications`            |
| `/collaboration-features/notifications`                              | `/products/notifications`                           |
| `/collaboration-features/notifications/concepts`                     | `/products/notifications/concepts`                  |
| `/collaboration-features/notifications/default-components`           | `/products/notifications/default-components`        |
| `/collaboration-features/notifications/hooks`                        | `/products/notifications/hooks`                     |
| `/collaboration-features/notifications/styling-and-customization`    | `/products/notifications/styling-and-customization` |
| `/collaboration-features/notifications/email-notifications`          | `/products/notifications/email-notifications`       |
| `/collaboration-features/ai-collaboration`                           | `/use-cases/ai-collaboration`                       |
| `/collaboration-features/ai-copilots`                                | `/products/ai-copilots`                             |
| `/collaboration-features/ai-copilots/features`                       | `/products/ai-copilots/features`                    |
| `/collaboration-features/ai-copilots/copilots`                       | `/products/ai-copilots/copilots`                    |
| `/collaboration-features/ai-copilots/default-components`             | `/products/ai-copilots/default-components`          |
| `/collaboration-features/ai-copilots/hooks`                          | `/products/ai-copilots/hooks`                       |
| `/collaboration-features/ai-copilots/knowledge`                      | `/products/ai-copilots/knowledge`                   |
| `/collaboration-features/ai-copilots/tools`                          | `/products/ai-copilots/tools`                       |
| `/collaboration-features/ai-copilots/styling-and-customization`      | `/products/ai-copilots/styling-and-customization`   |
| `/collaboration-features/ai-copilots/troubleshooting`                | `/products/ai-copilots/troubleshooting`             |

New pages have no redirect source.

Legacy `/ready-made-features/...` links discovered in existing content should be
updated directly to the new canonical routes. If the `liveblocks.io` repository
currently redirects those aliases to `/collaboration-features/...`, update them
to point directly to `/products/...` or `/use-cases/...` to avoid redirect
chains.

### Companion redirect release gate

The redirect implementation lives in the separate `liveblocks.io` repository,
but it is a release requirement for this change:

1. Copy the final ledger from this specification into the docs PR description.
2. Create a companion `liveblocks.io` PR containing every redirect in the ledger
   and direct updates for relevant `/ready-made-features/...` aliases.
3. Merge or deploy the redirect change before, or atomically with, the docs
   route migration.
4. Verify in preview or staging that every old canonical URL returns one
   redirect to its new canonical URL and that the destination returns 200.
5. Do not merge the docs route migration while the companion redirect PR is
   absent or incomplete.

## Migration and verification

1. Edit `docs/routes.json` first and use it as the canonical route manifest.
2. Move existing feature files into `docs/pages/products` and
   `docs/pages/use-cases`.
3. Create product landings, overviews, Sync pages, Feeds pages, and use-case
   pages.
4. Update homepage cards, parent titles, and internal links.
5. Audit `docs/pages`, `guides/pages`, and guide metadata for branded
   “Liveblocks Storage” prose:
   - Change the product name to Sync.
   - Preserve Storage data-model and API identifiers.
6. Do not change public API names, code variables, type declarations, endpoint
   paths, webhook event names, or storage permission strings.
7. Compare the old and new `docs/routes.json` path sets. Every removed path must
   appear exactly once in the redirect ledger.
8. Check all new MDX links and heading hierarchy.
9. Validate `docs/routes.json` as JSON.
10. Run these exact local checks:
    - `jq empty docs/routes.json`
    - `git diff --check`
    - `pnpm exec prettier --check docs/routes.json docs/pages/index.mdx docs/pages/products docs/pages/use-cases docs/superpowers/specs/2026-07-30-liveblocks-docs-products-sync-design.md`
    - `node docs/superpowers/scripts/validate-docs-navigation.mjs`
    - `rg -n '/docs/(collaboration-features|ready-made-features)/' docs/pages guides/pages`
      must return no matches.
11. No docs-specific link checker exists in this repository. Report the manual
    route/link audit results instead. Docs changes do not require a monorepo
    build.

The implementation must create
`docs/superpowers/scripts/validate-docs-navigation.mjs`. It must:

- Parse `docs/routes.json` and fail on malformed JSON or duplicate paths.
- Resolve an entry with `file` to `docs/pages/<file>`.
- Resolve every other local `path` to `docs/pages/<path>.mdx`.
- Permit exactly one generated-route exception:
  `/api-reference/liveblocks-python`, whose source is generated outside this
  repository.
- Ignore `href` entries because they are external or application-generated
  destinations rather than local page sources.
- Fail with the route and expected source path when a local file is missing.

## Non-goals

- Renaming public APIs
- Implementing LiveText itself
- Adding redirect code to the separate `liveblocks.io` repository in this
  worktree; the companion PR remains a release gate
- Rewriting API reference pages unrelated to links or terminology
- Rewriting all step-by-step guides into feature pages
