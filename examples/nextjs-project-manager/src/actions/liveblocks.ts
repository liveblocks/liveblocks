"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { getRoomId, Metadata, RoomWithMetadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";

export async function createIssue() {
  const issueId = nanoid();

  const metadata: Metadata = {
    issueId,
    title: "Untitled",
    progress: "none",
    priority: "none",
    assignedTo: "none",
    labels: [],
  };

  await liveblocks.createRoom(getRoomId(issueId), {
    defaultAccesses: ["room:write"],
    metadata,
  });

  redirect(`/issue/${issueId}`);
}

export async function getRoomsFromIds(roomIds: string[]) {
  const promises = [];

  for (const roomId of roomIds) {
    promises.push(await liveblocks.getRoom(roomId));
  }

  return (await Promise.all(promises)) as RoomWithMetadata[];
}
