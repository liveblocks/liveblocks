"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { nanoid } from "nanoid";

import { auth } from "@/auth/manager";
import {
  buildRoomId,
  liveblocks,
  parseRoomId,
  ROOM_PREFIX,
  type DocMetadata,
  type DocRoom,
} from "@/lib/liveblocks-server";
import { ownerIdFromSession } from "@/lib/session-user";
import { DOCS_PAGE_SIZE, type DocsPage } from "@/lib/docs-pagination";

async function requireOwnerId(): Promise<{ ownerId: string; ownerName: string }> {
  const session = await auth();
  const ownerId = ownerIdFromSession(session);
  if (!ownerId) {
    throw new Error("Not signed in");
  }
  const ownerName =
    session!.user.name ??
    session!.user.githubLogin ??
    session!.user.email ??
    ownerId;
  return { ownerId, ownerName };
}

/**
 * Returns a single page of the signed-in user's documents.
 *
 * `cursor` is the `nextCursor` returned by the previous call — pass `null`
 * (or omit) to fetch the first page. The returned `nextCursor` is `null`
 * when there are no more pages.
 */
export async function listMyDocsPage({
  cursor,
  limit = DOCS_PAGE_SIZE,
}: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<DocsPage> {
  const { ownerId } = await requireOwnerId();

  const { data, nextCursor } = await liveblocks.getRooms({
    startingAfter: cursor ?? undefined,
    limit,
    query: { roomId: { startsWith: `${ROOM_PREFIX}:${ownerId}:` } },
  });

  // Defensive filter: the room-id prefix should already restrict results to
  // the current user's docs but we double-check via metadata too.
  const docs = (data as DocRoom[]).filter(
    (room) => room.metadata?.ownerId === ownerId
  );

  return { docs, nextCursor: nextCursor ?? null };
}

export async function createDoc(formData?: FormData): Promise<void> {
  const { ownerId, ownerName } = await requireOwnerId();
  const titleRaw = formData?.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim().length > 0
      ? titleRaw.trim()
      : "Untitled document";

  const docId = nanoid(10);
  const roomId = buildRoomId(ownerId, docId);

  const metadata: DocMetadata = {
    ownerId,
    ownerName,
    title,
    type: "markdown-doc",
  };

  await liveblocks.createRoom(roomId, {
    defaultAccesses: [],
    usersAccesses: { [ownerId]: ["room:write"] },
    metadata,
  });

  revalidatePath("/docs");
  redirect(`/docs/${docId}`);
}

export async function deleteDoc(docId: string): Promise<void> {
  const { ownerId } = await requireOwnerId();
  const roomId = buildRoomId(ownerId, docId);

  let room: DocRoom;
  try {
    room = (await liveblocks.getRoom(roomId)) as DocRoom;
  } catch {
    revalidatePath("/docs");
    return;
  }
  if (room.metadata?.ownerId !== ownerId) {
    throw new Error("Forbidden");
  }

  await liveblocks.deleteRoom(roomId);
  revalidatePath("/docs");
}

export async function renameDoc(docId: string, title: string): Promise<void> {
  const { ownerId } = await requireOwnerId();
  const roomId = buildRoomId(ownerId, docId);

  const room = (await liveblocks.getRoom(roomId)) as DocRoom;
  if (room.metadata?.ownerId !== ownerId) {
    throw new Error("Forbidden");
  }

  await liveblocks.updateRoom(roomId, {
    metadata: { title: title.slice(0, 200) },
  });
  revalidatePath("/docs");
  revalidatePath(`/docs/${docId}`);
}

export async function getDoc(docId: string): Promise<DocRoom> {
  const { ownerId } = await requireOwnerId();
  const roomId = buildRoomId(ownerId, docId);
  const room = (await liveblocks.getRoom(roomId)) as DocRoom;
  const parsed = parseRoomId(room.id);
  if (!parsed || parsed.ownerId !== ownerId) {
    throw new Error("Forbidden");
  }
  return room;
}
