# Next.js AI CMS

Collaborative CMS fields (title, slug, excerpt, body, published date) stored in **Liveblocks Storage**, with:

- A **sidebar** of rooms (posts) and **New post** (same pattern as the Notion-like example: rooms are created via `@liveblocks/node`, listed with `getRooms` + a `roomId` prefix query).
- A **local-only** prompt at the top; submitting it calls `POST /api/ai-edit`.
- The API uses the [Vercel AI SDK](https://sdk.vercel.ai/) `streamText` with `Output.object()` and a Zod schema so the model streams **structured partial objects**; on each partial, the server calls [`mutateStorage`](https://liveblocks.io/docs/api-reference/liveblocks-node#post-rooms-roomId-storage-mutate) and [`createFeedMessage`](https://liveblocks.io/docs/collaboration-features/ai-collaboration) so clients see live storage + feed updates.
- **[`setPresence`](https://liveblocks.io/docs/collaboration-features/ai-collaboration#Presence)** marks which field the AI is touching (`editingField`), surfaced in the form UI and in **`AvatarStack`**.

## Docs

- [AI collaboration](https://liveblocks.io/docs/collaboration-features/ai-collaboration)
- [Feeds and agent workflows](https://liveblocks.io/blog/introducing-feeds-and-apis-for-agent-workflows)

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add your **Liveblocks secret** (`sk_...`) and **OpenAI** API key (`OPENAI_API_KEY`).
3. `npm install` then `npm run dev`.

`LIVEBLOCKS_SECRET_KEY` must be a valid `sk_` key so the app can build and run server routes.
