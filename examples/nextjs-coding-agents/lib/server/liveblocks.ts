import { Liveblocks } from "@liveblocks/node";
import type { ChatFeedMetadata } from "@/lib/types";

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

type FeedMetadataPatch = {
  [K in keyof ChatFeedMetadata]?: ChatFeedMetadata[K] | null;
};

/**
 * `updateFeed` replaces a feed's metadata wholesale, so partial updates
 * must be merged with the current metadata first. Passing `null` for a key
 * removes it. All metadata writes go through the workflow, which runs one
 * step at a time per chat, so this read-merge-write is safe.
 */
export async function patchFeedMetadata(
  liveblocks: Liveblocks,
  { roomId, feedId }: { roomId: string; feedId: string },
  patch: FeedMetadataPatch,
  current?: ChatFeedMetadata
): Promise<ChatFeedMetadata> {
  const existing = current ?? (await liveblocks.getFeed({ roomId, feedId })).metadata;

  const merged: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries({ ...existing, ...patch })) {
    if (value !== null && value !== undefined) {
      merged[key] = value;
    }
  }

  // XXX `merged` is built key-by-key so its type is a plain record, but it
  // only ever contains FeedMetadata keys/values.
  const metadata = merged as ChatFeedMetadata;
  await liveblocks.updateFeed({ roomId, feedId, metadata });
  return metadata;
}
