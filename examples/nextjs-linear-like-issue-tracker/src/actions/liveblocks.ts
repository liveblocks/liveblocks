"use server";

import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { RoomWithMetadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { createIssueRoomForAi } from "@/lib/create-issue-room";

export async function createIssue() {
  const { issueId } = await createIssueRoomForAi("Untitled");
  redirect(`/issue/${issueId}`);
}

export async function getStorageDocument(roomId: string) {
  const storage = await liveblocks.getStorageDocument(roomId, "json");
  return storage;
}

export async function getRoomsFromIds(roomIds: string[]) {
  noStore();
  const rooms = await Promise.all(
    roomIds.map((roomId) => liveblocks.getRoom(roomId))
  );
  return rooms as RoomWithMetadata[];
}

export async function deleteRoom(roomId: string) {
  await liveblocks.deleteRoom(roomId);
  redirect("/");
}
