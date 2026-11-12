# AI chat

Chat with an AI slide designer in a shared room: messages sync live via
Liveblocks Feeds, the assistant streams replies and HTML slide proposals, you
preview proposals on the deck or in the code tab, and apply or reject them for
everyone in the room.

## The conversation

- Each chat is a feed in the room; pick one from history or start a new chat
  with a fresh feed id.
- User and assistant messages appear in order with avatars and names; the
  assistant appears as Liveblocks AI.
- While anyone in the room is waiting on a reply for this chat, the composer
  shows a shared “thinking” state via presence on that feed.
- An empty chat offers starter prompts; after a finished assistant message,
  follow-up suggestion chips may appear until someone sends again.
- Pick a model from the composer before sending; the choice is sent with each
  reply request.
- A context indicator sums token usage reported on messages across the thread.
- Assistant messages can show reasoning, chain-of-thought steps, tool output,
  and sources when the model provides them.
- Copy assistant text or regenerate from an assistant message (deletes that
  message and requests a new reply from the prior history).
- Switching chats suspends only the conversation pane, not the whole panel.

## Proposals

- When the assistant includes fenced HTML slide documents, they become one or
  more proposals on that message, each tied to a slide id or marked as a new
  slide.
- While the reply streams, proposal cards show partial HTML and a generating
  state; when complete, status is pending until resolved.
- Cards label targets as New slide, Slide N, or Deleted slide when the id is no
  longer in the deck.
- Preview opens the proposal on the slide view for you locally; others can
  preview independently. Accept and reject in chat or from the code preview bar
  call the server so proposal status updates for the whole room.
- The latest pending proposal auto-opens in the slide tab once per message; if
  someone applies or rejects it, or the message goes away, preview closes.
- Applied and rejected states show on the card; only pending proposals offer
  Preview, Reject, and Apply actions.

## The assistant reply

- Sending a message creates the feed if needed, posts your text to the feed,
  then POSTs conversation history, model, room and feed ids, and current deck
  HTML (from the live Yjs doc) to `/api/ai-reply`.
- The route validates the room prefix and feed, ensures the feed exists, creates
  an empty streaming assistant message, then streams updates into it.
- With an AI gateway key, the Vercel AI SDK streams text and reasoning; chat
  text hides fenced HTML while streaming, and partial proposals appear as soon
  as a fence opens. The system prompt describes slide format, offline-only
  assets, and how to target slides by id, `new`, or the viewed slide. Deck
  context lists each slide’s HTML and marks which slide the user is viewing.
- Without a gateway key, a mock stream writes conversational copy, animates HTML
  into one proposal for the current slide, sets pending status, and adds sample
  follow-up suggestions.
- The final update attaches proposals, token usage, sources when present, and
  clears streaming; failures write a short error into the message.
- Missing Liveblocks secret key returns forbidden; bad room, feed, or slides
  payload returns bad request.

## Applying a proposal

- Apply or reject POSTs room, feed, message id, and action to
  `/api/apply-slide`.
- The handler loads the feed message, and on apply reads the shared Yjs
  document, applies each proposal (diff HTML into existing slides, append new
  slides for `new` or when the deck is empty), and pushes the binary update back
  to Liveblocks.
- New slide ids are returned so the client can focus a newly created slide;
  edits to existing slides return an empty id list.
- Unknown slide ids in a non-empty deck are skipped; reject only updates
  proposal status on the message and leaves Yjs unchanged.
- Missing secret, invalid room or action, missing message, or apply with no
  proposals yield the appropriate error status.

## Files

- `index.ts`: public surface
- `chat.tsx`: feed-backed chat UI, send/regenerate, proposal cards
- `proposal-actions.ts`: client helper to apply or reject via the API
- `proposal-code-preview.tsx`: full-height HTML preview with accept/reject bar
- `api/ai-reply.ts`: `POST /api/ai-reply`, stream assistant replies into feeds
- `api/html-proposals.ts`: parse fenced HTML from model output for chat vs
  proposals
- `api/apply-slide.ts`: `POST /api/apply-slide`, write accepted HTML into Yjs
- `tests/ai-reply.test.ts`: mock-mode reply route validation and streamed feed
  updates
- `tests/apply-slide.test.ts`: apply/reject, Yjs diffs, new slides, status codes
- `tests/html-proposals.test.ts`: fence parsing, streaming partial HTML, chat
  stripping
- `tests/proposal-actions.test.ts`: resolveProposal fetch payload and error
  handling
- `tests/ai-chat.spec.ts`: Playwright apply/reject flows; Cloud-only (no local
  Feeds)
