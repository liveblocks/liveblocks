#!/bin/sh
set -eu

if [ "${1:-}" != "--port" ] || [ -z "${2:-}" ]; then
  echo "Usage: $0 --port <port>" >&2
  exit 1
fi
PORT="$2"

# Start dev server in the background, suppress output
npx --yes liveblocks dev --ci --port "$PORT" >/dev/null 2>&1 &
DEV_SERVER_PID=$!

cleanup() {
  # Kill the npx process tree, then kill anything still listening on the port
  # (npx spawns intermediate processes, so pkill -P alone isn't enough)
  pkill -P "$DEV_SERVER_PID" 2>/dev/null || true
  kill "$DEV_SERVER_PID" 2>/dev/null || true
  wait "$DEV_SERVER_PID" 2>/dev/null || true
  lsof -ti :"$PORT" | xargs kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Poll /health until the server is ready
attempt=0
while ! curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 50 ]; then
    echo "Error: Dev server did not start within 10s" >&2
    exit 1
  fi
  sleep 0.2
done

# Run vitest
NODE_OPTIONS="--no-deprecation" npx vitest run
