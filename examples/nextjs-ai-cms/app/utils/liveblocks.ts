import { Liveblocks as LiveblocksNode, RoomData } from "@liveblocks/node";
import { nanoid } from "nanoid";
import type { CmsPost } from "../../liveblocks.config";
import { CMS_AI_FEED_ID, getRoomId } from "../config";

import "../../liveblocks.config";

const secret = process.env.LIVEBLOCKS_SECRET_KEY;
if (!secret?.startsWith("sk_")) {
  throw new Error(
    "Missing LIVEBLOCKS_SECRET_KEY — copy a secret key from https://liveblocks.io/dashboard/apikeys"
  );
}

export const liveblocks = new LiveblocksNode({ secret });

export type RoomInfo = { name: string; url: string };

export type TypedRoomData = RoomData & { metadata: { postId: string } };

export type TypedRoomDataWithInfo = TypedRoomData & { info: RoomInfo };

const ROOM_QUERY = {
  roomId: { startsWith: "liveblocks:examples:nextjs-ai-cms:" },
} as const;

function defaultPost(): CmsPost {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: "Untitled post",
    slug: "untitled-post",
    excerpt: "",
    body: "",
    publishedAt: today,
  };
}

export async function getLatestRoom() {
  const { data: rooms = [] } = await liveblocks.getRooms({
    limit: 1,
    query: ROOM_QUERY,
  });

  return rooms.length ? (rooms[0] as TypedRoomData) : null;
}

export async function createRoom() {
  const postId = nanoid();

  const room = (await liveblocks.createRoom(getRoomId(postId), {
    defaultAccesses: ["room:write"],
    metadata: { postId },
  })) as TypedRoomData;

  const post = defaultPost();

  await liveblocks.initializeStorageDocument(room.id, {
    liveblocksType: "LiveObject",
    data: {
      post: {
        liveblocksType: "LiveObject",
        data: post,
      },
    },
  });

  try {
    await liveblocks.createFeed({
      roomId: room.id,
      feedId: CMS_AI_FEED_ID,
      metadata: { kind: "cms-ai-editor" },
    });
  } catch {
    // Feed may already exist (idempotent retries)
  }

  return room;
}

export async function getRooms({
  cursor,
  limit,
}: {
  cursor?: string;
  limit?: number;
}) {
  const { data: rooms = [], nextCursor } = await liveblocks.getRooms({
    startingAfter: cursor,
    limit,
    query: ROOM_QUERY,
  });

  return { rooms: rooms as TypedRoomData[], nextCursor };
}

export async function getPostTitle(roomId: string) {
  try {
    const storage = (await liveblocks.getStorageDocument(roomId, "json")) as {
      post?: CmsPost;
    };
    return storage.post?.title ?? "";
  } catch {
    return "";
  }
}
