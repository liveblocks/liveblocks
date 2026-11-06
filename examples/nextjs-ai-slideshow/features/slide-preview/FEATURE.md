# Slide preview

See the selected slide rendered live, scaled to fit the canvas, with other
users' cursors and element selections, draggable comment pins, in-slide visual
editing, and an optional full-slide preview of AI-proposed changes you can
accept or reject.

## Rendering the slide

- The slide appears inside a sandboxed iframe at a fixed widescreen size, scaled
  down or up so it fits the preview area with a little margin for shadow and
  focus rings.
- The iframe loads each slide's HTML once when you switch slides; later updates
  from the shared deck are applied inside the live document so the preview does
  not flash or reload on every change.
- While someone is mid-gesture in the visual editor, incoming HTML updates wait
  until the gesture finishes, then apply any pending content.
- After a local visual edit is committed, the preview can ignore duplicate or
  stale shared HTML until the room's document matches what was edited.
- The preview hosts the visual editor against the iframe when you are not
  previewing a proposal.

## Presence

- Other collaborators on the same slide see each other's cursors with name
  labels and theme colors; cursors on other slides are hidden.
- Labels stay a consistent on-screen size even when the slide is zoomed via
  scale.
- When others select elements in the visual editor, you see colored outlines
  around those elements plus a small name tag; outlines track layout as the
  slide changes.
- Cursor and selection geometry is expressed relative to the slide so overlays
  stay aligned at any zoom level.

## Comments

- From comment placement mode, clicking on the slide drops a pin at that spot
  (stored as percentages of the slide width and height) and opens a composer to
  write the first message.
- A dim overlay lets you cancel placement with a click or right-click; while
  placing, a ghost pin follows the pointer.
- Existing pins can be dragged to a new position; opening a thread or dragging
  brings that pin above the others.
- Comment pins and placement UI are tied to the shared slide, so they are hidden
  while you preview an AI proposal on that canvas.
- A thread you just created opens ready for typing; submitting the composer
  finishes placement and clears the temporary state.

## Previewing a proposal

- When the AI chat offers a slide change, the preview can show the proposed HTML
  in place of the shared slide, with a prominent ring and a bar to Accept or
  Reject.
- While resolving, the chosen action shows a loading state and both buttons are
  disabled.
- The shared slide iframe is non-interactive during preview; cursors,
  selections, and comment pins are suppressed, and your presence cursor and
  selection are cleared.
- Proposals for a brand-new slide use the proposed HTML only, without loading
  the deck's stored HTML for that id until you apply or reject.

## Files

- `index.ts`: public surface
- `slide-preview.tsx`: slide canvas, presence overlays, comments, and proposal
  preview UI
- `tests/comments.spec.ts`: placing a comment on the slide creates a pin visible
  to another user in the same room; runs only when `LIVEBLOCKS_CLOUD` is set
  because the local dev server has no Comments
