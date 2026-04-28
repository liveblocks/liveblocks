# Liveblocks + Supabase — context for your assistant

**Purpose:** Help users mirror Liveblocks Storage, Yjs, Comments, and Threads into Supabase Postgres via webhooks and the REST API.

**Do:**

- Treat Liveblocks as the source of truth for Storage, Yjs, Comments, and Threads; treat Supabase as an eventually consistent mirror.
- Trigger syncs from `storageUpdated`, `ydocUpdated`, and thread/comment webhooks; fetch current state with the Liveblocks REST API; `upsert` into Supabase.
- Verify webhooks with `WebhookHandler` from `@liveblocks/node`, passing the exact raw body received.
- Use stable primary keys (`room_id`, `thread_id`, `comment_id`) so retried deliveries update the same row.
- Keep the Supabase service role key server-only and confirm RLS allows the server client to write to the mirror table.

**Do not:**

- Conflate `LIVEBLOCKS_SECRET_KEY` (REST) with `LIVEBLOCKS_WEBHOOK_SECRET` (signature verification).
- Use `insert` for webhook-driven writes, or omit a stable primary key — duplicates will appear on retry.
- Re-stringify a parsed JSON body before `verifyRequest`; pass the raw body Liveblocks sent.
- Treat Supabase as the live editing channel — `storageUpdated` and `ydocUpdated` are throttled.
- Mirror more Comments or Threads fields than the user's workflow needs.

Tailor examples to the user's stack (Next.js route handler, Express, etc.) and the specific Liveblocks feature they're syncing.
