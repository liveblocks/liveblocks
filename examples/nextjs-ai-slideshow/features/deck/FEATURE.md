# Deck

Add, reorder, select and delete the slides of a shared deck, and see every slide
as a live thumbnail.

## The slide list

- A new room opens with one starter slide (the "Move elements, edit code, chat
  to AI." headline). It's seeded once, by the first client to finish syncing.
- "Add slide" appends an empty slide ("Get started by chatting to AI") and
  selects it.
- Each thumbnail has a delete control; the last remaining slide can't be
  deleted.
- Thumbnails can be dragged to reorder the deck; the order is shared.
- Slides added, removed or moved in one tab appear in every other tab of the
  same room.
- Thumbnails of the AI's proposed slides appear in the list while a proposal is
  being previewed (see ai-chat).

## Thumbnails

- A thumbnail is a scaled, non-interactive render of the slide's HTML.
- It's loaded once and then patched in place as the slide's HTML changes, so
  streaming edits don't make it flash.

## The shared document

- The deck is a Yjs document: an array of slide ids plus one text per slide
  holding its HTML (see `slide-doc.ts`). Every feature that reads or writes
  slide HTML goes through these helpers.
- `useSlideHtml` returns the current HTML of a slide and updates on every remote
  change; switching slides returns the new slide's HTML in the same render, so
  nothing shows the previous slide's content for a frame.

## Replacing a deck from outside

- `POST /api/replace-room-html` with `{ roomId, slides: [html, …] }` replaces
  the whole deck of a room whose id starts with the example's prefix, and
  returns the new slide ids. Bad input answers 400; without
  `LIVEBLOCKS_SECRET_KEY` it answers 403.

## Files

- `index.ts`: public surface
- `slides.ts`: `useSlides` (ids, add, delete, move; seeds the starter slide) and
  `useSlideHtml`
- `slide-doc.ts`: the Yjs document shape and accessors
- `slide-html.ts`: slide dimensions and the starter and empty slide HTML
- `slide-sidebar.tsx`: the thumbnail list with add, delete and drag-to-reorder
- `api/replace-room-html.ts`: `POST /api/replace-room-html`
- `tests/slides.test.ts`: `useSlides` and `useSlideHtml` against a Yjs doc
- `tests/slide-doc.test.ts`: document accessors
- `tests/slide-sidebar.test.tsx`: the sidebar's controls and labels
- `tests/replace-room-html.test.ts`: the replace route's validation and result
- `tests/deck.spec.ts`: starter slide, add/delete, two-tab sync, drag reorder
