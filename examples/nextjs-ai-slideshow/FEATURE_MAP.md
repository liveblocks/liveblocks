# Feature map

Find the feature that owns a behaviour here, then read its FEATURE.md before
changing anything. The rules are in [AGENTS.md](AGENTS.md). To find the feature
that owns a file, run `npm run owner -- <path>`.

## Features

| Feature                                            | What a user can do                                                                                                                                                                                                                                         | Also called                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [ai-chat](features/ai-chat/FEATURE.md)             | Chat with an AI slide designer in a shared room: messages sync live via Liveblocks Feeds, the assistant streams replies and HTML slide proposals, you preview proposals on the deck or in the code tab, and apply or reject them for everyone in the room. | assistant, proposals, chat                   |
| [code-editor](features/code-editor/FEATURE.md)     | Edit the current slide's HTML as code, together with everyone else in the room, and see the preview update as you type.                                                                                                                                    | Code tab, HTML editor, CodeMirror            |
| [deck](features/deck/FEATURE.md)                   | Add, reorder, select and delete the slides of a shared deck, and see every slide as a live thumbnail.                                                                                                                                                      | slides, sidebar, thumbnails, slideshow       |
| [pptx-export](features/pptx-export/FEATURE.md)     | Download the whole deck as a PowerPoint file, one image per slide.                                                                                                                                                                                         | download, PowerPoint                         |
| [slide-preview](features/slide-preview/FEATURE.md) | See the selected slide rendered live, scaled to fit the canvas, with other users' cursors and element selections, draggable comment pins, in-slide visual editing, and an optional full-slide preview of AI-proposed changes you can accept or reject.     | canvas, Preview tab, comments, pins, cursors |
| [users](features/users/FEATURE.md)                 | Join a room as one of the example's demo users and see who else is in it, by name and avatar.                                                                                                                                                              | presence, avatars, auth, mentions            |
| [visual-editor](features/visual-editor/FEATURE.md) | Move and resize elements on the slide preview, edit inline text, and sync changes into the shared slide HTML—with undo and redo tied to the collaborative document.                                                                                        | drag and drop, inline editing, WYSIWYG       |

## Views

| View                                            | Where it appears                                                                                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [slideshow-app](views/slideshow-app/FEATURE.md) | The whole screen once a room is open: the deck sidebar on the left, the slide preview or code editor in the middle, and the AI chat on the right. |

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
