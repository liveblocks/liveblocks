# Liveblocks Dev Server — Docker

Run the Liveblocks dev server in a container.

## Quick start

```bash
docker run -p 1153:1153 ghcr.io/liveblocks/dev-server
```

The server is ready when `curl http://localhost:1153/health` returns
`{"status":"ok"}`.

## Persisting room data

SQLite databases for room storage are written to `/app/.liveblocks` inside the
container. Mount a volume to persist data across restarts:

```bash
docker run -p 1153:1153 \
  -v liveblocks-data:/app/.liveblocks \
  ghcr.io/liveblocks/dev-server
```

