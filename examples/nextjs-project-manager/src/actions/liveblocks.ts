"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { getRoomId, Metadata, RoomWithMetadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { LiveList, LiveObject, toPlainLson } from "@liveblocks/core";

export async function createIssue() {
  const issueId = nanoid();
  const roomId = getRoomId(issueId);

  const metadata: Metadata = {
    issueId,
    title: "Untitled",
    progress: "none",
    priority: "none",
    assignedTo: "none",
    labels: [],
  };

  await liveblocks.createRoom(roomId, {
    defaultAccesses: ["room:write"],
    metadata,
  });

  const initialStorage: LiveObject<Liveblocks["Storage"]> = new LiveObject({
    meta: new LiveObject({ title: "Untitled" }),
    properties: new LiveObject({
      progress: "none",
      priority: "none",
      assignedTo: "none",
    }),
    labels: new LiveList([]),
    links: new LiveList([]),
  });

  await liveblocks.initializeStorageDocument(
    roomId,
    toPlainLson(initialStorage) as any
  );

  redirect(`/issue/${issueId}`);
}

export async function getStorageDocument(roomId: string) {
  const storage = await liveblocks.getStorageDocument(roomId, "json");
  return storage;
}

export async function getRoomsFromIds(roomIds: string[]) {
  const promises = [];

  for (const roomId of roomIds) {
    promises.push(await liveblocks.getRoom(roomId));
  }

  return (await Promise.all(promises)) as RoomWithMetadata[];
}

export async function deleteRoom(roomId: string) {
  await liveblocks.deleteRoom(roomId);
  redirect("/");
}
