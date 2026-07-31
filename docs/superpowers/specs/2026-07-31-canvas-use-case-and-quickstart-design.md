# Canvas use case and custom Next.js quickstart

Date: 2026-07-31

## Goal

Make the Canvas use-case page useful to developers choosing how to build a
collaborative canvas, then add a focused Next.js quickstart that teaches a
custom implementation with Liveblocks React hooks.

The use-case page should explain what Liveblocks contributes without becoming a
tutorial. The quickstart should build a small but complete canvas with draggable
boxes, add/delete controls, multiplayer undo/redo, and Presence.

## Scope

This change updates:

- `/docs/use-cases/canvas`
- a new `/docs/get-started/nextjs-canvas-custom` page
- `docs/routes.json`, so the new page is routable

No public API changes, website component changes, new example application, or
existing URL moves are included. The new route does not require a redirect.

## Canvas use-case page

Keep the existing opening and the Mux video already added to the page. Replace
the API-list-first content with this task-first sequence:

1. A **Get started** section with three cards:
   - Build a custom canvas with Next.js:
     `/docs/get-started/nextjs-canvas-custom`
   - Add Liveblocks to Tldraw: `/docs/get-started/nextjs-tldraw`
   - Add comments to a canvas: `/docs/get-started/nextjs-comments-canvas`
2. A **What Liveblocks adds to a canvas** section with short, skimmable
   explanations of:
   - shared shapes and layers with Storage
   - live cursors and selections with Presence
   - per-user multiplayer undo/redo
   - anchored discussions with Comments
   - saved versions and server/AI editing
3. A small data-model snippet showing independently editable `LiveObject` shapes
   keyed by ID in a `LiveMap`. Link exact APIs and the deeper Sync pages from
   the surrounding paragraphs.
4. An **Examples** section with cards for:
   - Collaborative Whiteboard: `collaborative-whiteboard/nextjs-whiteboard`,
     using `/images/examples/thumbnails/collaborative-whiteboard.jpg`
   - Advanced Collaborative Whiteboard:
     `collaborative-whiteboard-advanced/nextjs-whiteboard-advanced`, using
     `/images/examples/thumbnails/collaborative-whiteboard-advanced.jpg`
   - Tldraw Whiteboard: `tldraw-whiteboard/nextjs-tldraw-whiteboard-storage`,
     using `/images/examples/thumbnails/tldraw-whiteboard.jpg`
   - Canvas Comments: `canvas-comments/nextjs-comments-canvas`, using
     `/images/examples/thumbnails/comments-canvas.png`

Use existing `DocsCard`, `ExampleCard`, and `ListGrid` patterns. Keep each
feature explanation to one short paragraph. The page should help readers choose
a starting point, while the new guide owns the step-by-step implementation.

## Custom canvas quickstart

### Page contract

- Route: `/docs/get-started/nextjs-canvas-custom`
- Framework: Next.js App Router
- UI layer: React and `@liveblocks/react` hooks only; do not add Redux or
  Zustand
- Shared model: `LiveMap<string, LiveObject<Shape>>`
- Interaction: update a shape's Storage coordinates on every pointer move
- Scope: boxes can be selected, added, deleted, dragged, undone, and redone
- Final enhancement: Presence adds live cursors and shared selections in one
  step containing multiple coordinated snippets
- Development connection: use the docs public-key placeholder
  `publicApiKey={"{{PUBLIC_KEY}}"}`, matching existing Next.js quickstarts
- Room ID: use the fixed tutorial ID `my-canvas-room`; explain that a real app
  should use a stable ID derived from the document being opened

### Data model

Use a compact shape model:

```ts
type Shape = {
  x: number;
  y: number;
  fill: string;
};
```

Storage contains `shapes: LiveMap<string, LiveObject<Shape>>`. Each shape is an
independent collaborative object, so moving one shape does not replace the
entire canvas document.

The initial implementation keeps `selectedShapeId` in local React state. The
final Presence step changes the collaborative presence type to:

```ts
type Presence = {
  cursor: { x: number; y: number } | null;
  selectedShapeId: string | null;
};
```

In that final step, the current user's Presence replaces local state as the
selection source of truth. This progression keeps the core Storage tutorial
focused before adding ephemeral multiplayer state.

### Guide steps

1. **Install and initialize Liveblocks** Install `@liveblocks/client` and
   `@liveblocks/react`, then initialize `liveblocks.config.ts`.
2. **Define the canvas Storage types** Add the `Shape` type and
   `LiveMap<string, LiveObject<Shape>>` Storage type.
3. **Create the Liveblocks room** Set up `LiveblocksProvider`, `RoomProvider`,
   `ClientSideSuspense`, and initial shapes. Use
   `publicApiKey={"{{PUBLIC_KEY}}"}` and room ID `my-canvas-room`, then wrap the
   page in the room. Keep production authentication out of the core tutorial and
   link to `/docs/authentication` at the end.
4. **Render and select boxes** Read shapes with `useStorage`, render them in an
   absolutely positioned canvas, and keep the current selection in local state.
5. **Add and delete boxes** Use `useMutation` to insert a new `LiveObject` under
   a generated ID and to delete the selected entry.
6. **Drag boxes** Capture the pointer on pointer down. Store the
   pointer-to-shape offset locally, then call a Storage mutation on every
   pointer move so collaborators receive the shape coordinates continuously.
7. **Add multiplayer undo/redo** Add controls with `useUndo`, `useRedo`,
   `useCanUndo`, and `useCanRedo`. Use `useHistory().pause()` at the start of a
   drag and `resume()` when it ends so every pixel is synchronized but one drag
   creates one history entry.
8. **Add Presence** Keep this as one step, following the recent AI Comments
   guide pattern of several snippets in a single `StepContent`:
   - extend the `Presence` type and set `initialPresence`
   - publish cursor position and selection with `useUpdateMyPresence`
   - read `useOthers` and render other users' cursors and selection outlines

Finish with a short success statement and links to the Canvas use-case page,
Presence, multiplayer undo/redo, data types, and the related examples.

## Interaction lifecycle and edge cases

- Use pointer capture so dragging continues when the pointer leaves a box.
- Track the active pointer ID and ignore unrelated pointer events.
- Funnel `pointerup`, `pointercancel`, and lost pointer capture through one
  idempotent `endDrag` function. Mark the drag inactive before calling
  `resume()`, so overlapping termination events cannot resume twice.
- Add effect cleanup that calls the same idempotent `endDrag` on component
  unmount or room change. History therefore cannot remain paused if the canvas
  disappears mid-drag.
- If the dragged shape was deleted remotely, the move mutation should do nothing
  rather than fail.
- Deleting the selected shape clears the local selection. In the Presence
  enhancement, publish a `null` selection after deletion.
- Watch the shapes snapshot and clear the local or Presence selection when its
  selected ID no longer exists. This also covers a remote collaborator deleting
  the selected shape.
- Cursors are canvas-relative and become `null` on pointer leave.
- Presence remains ephemeral; shapes always remain in Storage.

## Snippet boundaries

The guide may use one complete `Canvas.tsx` snippet for the basic renderer,
followed by focused replacement or addition snippets for later steps. Every
snippet must name its file and use `+++` markers for changed lines. Avoid a
single oversized final file when a smaller event handler or component snippet is
sufficient.

Use imports from `@liveblocks/react/suspense` for hooks on Storage-backed UI.
Link every first mention of a public component, hook, or data type to the
relevant API reference.

## Verification

- Run Prettier in write mode on the spec, both MDX pages, and
  `docs/routes.json`.
- Validate that `docs/routes.json` parses and includes
  `/get-started/nextjs-canvas-custom` exactly once.
- Register the route in the existing hidden get-started list as:
  `{ "title": "Custom canvas", "path": "/get-started/nextjs-canvas-custom", "hidden": true }`.
  Place it immediately before the existing Tldraw route.
- Run `node docs/superpowers/scripts/validate-docs-navigation.mjs`.
- Inspect MDX for balanced JSX, valid heading hierarchy, existing component
  props, and working internal links.
- Check that every code fence uses modern imports and the snippets remain
  internally consistent from step to step.
- Confirm the Canvas page still renders the existing Mux video.
- Confirm all four example slugs and thumbnail paths exist in the canonical
  website catalog at `liveblocks.io/src/constants/examples.ts`.
- Confirm no existing route changed, so the redirect ledger needs no entry.
