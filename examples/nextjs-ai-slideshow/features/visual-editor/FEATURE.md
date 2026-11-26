# Visual editor

Move and resize elements on the slide preview, edit inline text, and sync
changes into the shared slide HTML—with undo and redo tied to the collaborative
document.

## Selecting and hovering

- Click an element in the preview to select it; a stronger outline marks the
  selection.
- Moving the pointer highlights elements under the cursor when you are not
  dragging or editing text.
- Clicking empty slide chrome clears the selection.
- When the preview reloads, the same element stays selected if it still exists.

## Dragging elements

- Drag a selected element to move it; small pointer movement does not start a
  drag.
- Movement applies as a CSS translate on the element.
- Releasing the pointer after a drag saves the new layout into the slide HTML;
  canceling restores the previous transform.
- While you drag, updates can stream into the document so collaborators see
  progress.

## Inline text editing

- Double-click an element that only contains inline markup (headings,
  paragraphs, links, and similar) to edit its text in place.
- Mod+Enter or clicking away commits the edit; Escape cancels it and restores
  the original text.
- Enter inserts a line break without breaking the element’s structure.
- While editing, slide-level undo shortcuts defer to the browser’s native text
  undo.

## Undo and redo

- Visual changes applied to slide HTML are grouped for undo and redo on the
  shared Yjs document.
- Only edits made as visual edits participate; other collaborators’ changes are
  not undone by mistake.
- Mod+Z undoes and Mod+Shift+Z or Mod+Y redoes when focus is in the preview (not
  during inline text editing).
- Starting a drag or text edit ends the current undo capture so each gesture
  becomes its own undo step.

## Mapping elements to source

- Each preview element is identified by a path of child indices from the slide
  body.
- That path is matched against the parsed slide HTML to find the exact character
  range for the element’s outer markup.
- Edits replace that slice in the collaborative text; anchors stay valid when
  remote edits shift the document around.
- If mapping fails, the editor falls back to diffing the whole slide HTML.

## Files

- `index.ts`: public surface
- `visual-editor.tsx`: iframe hook for hover, selection, drag, text edit, and
  commits into Yjs
- `html-source-map.ts`: DOM paths and parse5 source ranges for element slices
- `slide-undo.ts`: Yjs undo manager scoped to visual-edit transactions
- `tests/html-source-map.test.ts`: source ranges, path round-trips, and anchor
  behavior under concurrent Yjs edits
- `tests/slide-undo.test.ts`: undo/redo for visual origin, ignored non-visual
  edits, late-added slides
- `tests/visual-editor.spec.ts`: e2e inline text edit sync and drag with
  undo/redo in the slideshow UI
