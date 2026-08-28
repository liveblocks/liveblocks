# AI Canvas (MagicPath-style)

This example recreates a MagicPath-style collaborative AI canvas using:

- **Next.js App Router**
- **tldraw** (`hideUi`) with custom toolbar/sidebar chrome
- **Liveblocks Storage** (`LiveMap<string, TLRecord>`) for realtime canvas sync
- **Liveblocks feeds** (`@liveblocks/react`) for the agent chat stream
- **@liveblocks/node** for auth + server-side storage/presence updates
- **Anthropic** (`claude-sonnet-4-6`) for tool-based agent reasoning

## Routes

- `/file/[id]` → editable canvas
- `/file/readonly/[id]` → live read-only mirror (same room, read access token)

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```env
   LIVEBLOCKS_SECRET_KEY=sk_...
   NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...
   ANTHROPIC_API_KEY=...
   ```

3. Run the app:

   ```bash
   npm run dev
   ```

4. Open:

   - http://localhost:3000/file/demo
   - Use **Copy preview** to open the read-only mirror.
