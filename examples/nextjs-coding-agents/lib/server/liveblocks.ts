import { Liveblocks } from "@liveblocks/node";

export const ROOM_ID_PREFIX = "liveblocks:examples:nextjs-coding-agents";

export function getLiveblocks() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    throw new Error("Missing LIVEBLOCKS_SECRET_KEY");
  }

  return new Liveblocks({
    secret,
    // Used when testing against a self-hosted Liveblocks dev server.
    // You can ignore this when running the example yourself.
    baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL,
  });
}

export function isExampleRoomId(roomId: string) {
  return roomId.startsWith(ROOM_ID_PREFIX);
}
