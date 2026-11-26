# Slideshow app

The whole screen once a room is open: the deck sidebar on the left, the slide
preview or code editor in the middle, and the AI chat on the right.

## Layout and header

- Left: the deck's thumbnail sidebar. Centre: a header plus the Preview or Code
  tab. Right: the AI chat.
- The header holds the Preview/Code tabs, Undo/Redo, the avatar stack of
  everyone in the room, the Comment button (Preview tab only) and "Download
  .pptx".
- Undo and Redo act on the visual-edit history on the Preview tab and on the
  code editor's own history on the Code tab; both are disabled while an AI
  proposal is being previewed.
- Mod+Z / Mod+Y pressed outside the slide (and outside any text field) undo and
  redo on the Preview tab; inside the slide the visual editor handles them, and
  on the Code tab the editor does.

## Selection

- Exactly one slide is selected. Deleting the selected slide selects its
  neighbour; a slide deleted by someone else falls back the same way.
- When applying an AI proposal creates new slides, the last new slide becomes
  selected as soon as it arrives from the shared document.

## Previewing a proposal

- A proposal under preview replaces the shared slide in the Preview tab and the
  shared HTML in the Code tab, with Accept and Reject in both; new-slide
  proposals appear as extra thumbnails. Previewing is local to this user;
  accepting or rejecting resolves the proposal for everyone.
- Comment placement is turned off while previewing a proposal and when switching
  to the Code tab.

## Files

- `index.ts`: public surface
- `slideshow-app.tsx`: composes the features and owns selection, panel, undo
  routing and proposal preview state
- `tests/presence.spec.ts`: the header avatar stack shows every distinct user in
  the room
