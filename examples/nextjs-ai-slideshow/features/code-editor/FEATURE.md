# Code editor

Edit the current slide's HTML as code, together with everyone else in the room,
and see the preview update as you type.

## Editing

- The Code tab shows the selected slide's full HTML in a CodeMirror editor with
  HTML highlighting and line wrapping.
- Every keystroke is shared through the slide's Yjs text: other users' editors
  and the slide preview update live, and their cursors and selections appear in
  your editor in their user colour.
- Switching slides opens that slide's HTML in a fresh editor.

## Undo and redo

- The editor keeps its own history (Mod+Z / Mod+Y, like any code editor), which
  only undoes edits made in this editor.
- While the Code tab is open, the header's Undo and Redo buttons drive this same
  history and are disabled when there's nothing to undo or redo.

## Files

- `index.ts`: public surface
- `collaborative-editor.tsx`: the CodeMirror editor bound to the slide's Yjs
  text, reporting its undo/redo state to the header
- `tests/code-editor.spec.ts`: typing syncs to the preview and to another user;
  the header undo/redo drive the editor's history on the Code tab
