# Feature map

Find the feature that owns a behaviour here, then read its FEATURE.md before
changing anything. The rules are in [AGENTS.md](AGENTS.md). To find the feature
that owns a file, run `npm run owner -- <path>`.

## Features

| Feature                            | What a user can do                                                                            | Also called                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------- |
| [users](features/users/FEATURE.md) | Join a room as one of the example's demo users and see who else is in it, by name and avatar. | presence, avatars, auth, mentions |

## Views

| View | Where it appears |
| ---- | ---------------- |

## Building blocks

| Block                                     | Use it for                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [ai-elements](components/ai-elements/)    | Chat UI pieces (conversation, message, prompt input, suggestions) from AI Elements. Vendored: re-sync, don't edit. |
| [help-button](components/help-button.tsx) | The floating "?" that links to the example's source and docs (gallery convention).                                 |
| [ui](components/ui/)                      | shadcn/ui primitives (button, dialog, tabs, tooltip…). Vendored: re-sync, don't edit.                              |

## Shared code

| Module                                            | Reach for it when                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [iframe-html](lib/iframe-html.ts)                 | You need to update an iframe's HTML without reloading it (slide preview, thumbnails). |
| [use-example-room-id](lib/use-example-room-id.ts) | You need the room id; it folds in the gallery's `exampleId` query param.              |
| [utils](lib/utils.ts)                             | You need to merge Tailwind class names (`cn`). Never concatenate by hand.             |

## Cross-cutting

- Data model: the deck is a Yjs document (`slides` array of slide ids, one
  `Y.Text` of HTML per slide); chat is a Liveblocks Feed per room; comments are
  Liveblocks threads with slide-relative pin metadata (`liveblocks.config.ts`).
- API routes: each `app/api/<name>/route.ts` re-exports one handler from
  `features/<feature>/api/`. Run `npm run owner -- <route file>` to find its
  feature.
- Realtime: presence (cursors, selections, "AI is thinking") is declared in
  `liveblocks.config.ts`; every feature reads it through `@liveblocks/react`.

## Not yet migrated

| Legacy path                    | Moving to                                        |
| ------------------------------ | ------------------------------------------------ |
| `app/chat.tsx`                 | `features/ai-chat/`                              |
| `app/proposal-actions.ts`      | `features/ai-chat/`                              |
| `app/api/ai-reply/`            | `features/ai-chat/api/`                          |
| `app/api/apply-slide/`         | `features/ai-chat/api/`                          |
| `app/collaborative-editor.tsx` | `features/code-editor/`                          |
| `app/slides.ts`                | `features/deck/`                                 |
| `app/slide-doc.ts`             | `features/deck/`                                 |
| `app/slide-html.ts`            | `features/deck/`                                 |
| `app/slide-sidebar.tsx`        | `features/deck/`                                 |
| `app/api/replace-room-html/`   | `features/deck/api/`                             |
| `app/slide-preview.tsx`        | `features/slide-preview/`                        |
| `app/visual-editor.tsx`        | `features/visual-editor/`                        |
| `app/html-source-map.ts`       | `features/visual-editor/`                        |
| `app/slide-undo.ts`            | `features/visual-editor/`                        |
| `app/page.tsx`                 | `views/slideshow-app/ and features/pptx-export/` |
| `tests/*.test.ts`              | `features/<feature>/tests/ or lib/tests/`        |
| `tests/*.test.tsx`             | `features/<feature>/tests/`                      |
| `tests/*.spec.ts`              | `features/<feature>/tests/`                      |
