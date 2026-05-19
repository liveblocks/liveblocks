import "server-only";

import { Liveblocks } from "@liveblocks/node";

export {
  ROOM_PREFIX,
  buildRoomId,
  parseRoomId,
  type DocMetadata,
  type DocRoom,
} from "./room-ids";

// Lazy singleton: the Liveblocks node client validates the secret in its
// constructor. We want to defer that check until the first actual call so
// that `next build` can inspect this module without `LIVEBLOCKS_SECRET_KEY`
// being set.
let _liveblocks: Liveblocks | null = null;

function getLiveblocks(): Liveblocks {
  if (!_liveblocks) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      throw new Error(
        "Missing LIVEBLOCKS_SECRET_KEY. Add it to your .env.local file."
      );
    }
    _liveblocks = new Liveblocks({ secret });
  }
  return _liveblocks;
}

export const liveblocks: Liveblocks = new Proxy({} as Liveblocks, {
  get(_target, prop) {
    const target = getLiveblocks() as unknown as Record<
      string | symbol,
      unknown
    >;
    const value = target[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(target)
      : value;
  },
});
