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

export async function listMyDocs(): Promise<DocRoom[]> {
  const { ownerId } = await requireOwnerId();

  // Pull every room namespaced under this user's ownerId. For an example app
  // we read every page; in production you would paginate the UI itself.
  const all: DocRoom[] = [];
  let cursor: string | undefined = undefined;

  do {
    const { data, nextCursor } = await liveblocks.getRooms({
      startingAfter: cursor,
      limit: 100,
      query: { roomId: { startsWith: `${ROOM_PREFIX}:${ownerId}:` } },
    });

    for (const room of data as DocRoom[]) {
      if (room.metadata?.ownerId === ownerId) {
        all.push(room);
      }
    }

    cursor = nextCursor ?? undefined;
  } while (cursor);

  all.sort((a, b) => {
    const at = new Date(a.lastConnectionAt ?? a.createdAt).getTime();
    const bt = new Date(b.lastConnectionAt ?? b.createdAt).getTime();
    return bt - at;
  });

  return all;
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

  // Verify ownership before deletion to avoid acting on rooms the user
  // shouldn't touch (even though the secret key could).
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
