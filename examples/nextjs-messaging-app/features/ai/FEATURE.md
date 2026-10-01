# AI teammate

**Liveblocks AI** appears alongside the human users in DM lists, mention
suggestions, and the members popover, always marked with an **Agent** badge and
always shown online. It posts through `@liveblocks/node` from the
`/api/ai-reply` route and never logs in.

## Mention the AI in a channel or human DM

- **How:** send a message containing `@Liveblocks AI`.
- **What happens:** a thread is created on your message and opened immediately.
  The AI's reply streams into that thread, not into the channel. Other thread
  participants receive a "replied in a thread" activity item pointing at the
  streaming reply, so their Activity fills in as the reply lands.

## DM the AI

- **How:** open **Liveblocks AI** from either DM list and send any message. No
  mention is needed.
- **What happens:** the AI replies inline in the DM, using the last 24 messages
  of the conversation as context.

## Streaming

- A reply starts as an empty message showing a spinner and "Thinking…", then
  fills in as text streams. While streaming, the message has no reaction or
  delete controls. Previews in the DMs tab and Activity update live.

## Real vs. mock replies

- With an `AI_GATEWAY_API_KEY` environment variable set, replies come from
  `openai/gpt-5.4-mini` via the Vercel AI Gateway, with a short system prompt
  that lists the known users so the model can @mention them.
- Without the key, a mock reply is streamed word by word explaining that the key
  is missing and echoing what you said.
- If generation fails, the message is finalised with an error note.

## Files

- `features/ai/api/ai-reply.ts`
- `features/ai/request-ai-reply.ts`
- Tests: `tests/`
