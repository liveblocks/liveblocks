import type { RoomData } from "@liveblocks/node";

export const ROOM_PREFIX = "liveblocks:examples:nextjs-yjs-markdown-versions";

export type DocMetadata = {
  ownerId: string;
  ownerName: string;
  title: string;
  type: "markdown-doc";
};

export type DocRoom = RoomData & { metadata: DocMetadata };

export function buildRoomId(ownerId: string, docId: string) {
  return `${ROOM_PREFIX}:${ownerId}:${docId}`;
}

export function parseRoomId(
  roomId: string
): { ownerId: string; docId: string } | null {
  const prefix = `${ROOM_PREFIX}:`;
  if (!roomId.startsWith(prefix)) return null;
  const rest = roomId.slice(prefix.length);
  const colon = rest.indexOf(":");
  if (colon === -1) return null;
  return { ownerId: rest.slice(0, colon), docId: rest.slice(colon + 1) };
}
