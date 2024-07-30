"use server";

import { liveblocks } from "@/liveblocks.server.config";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { getRoomId, Metadata } from "@/config";

export async function getRoom(roomId: string) {
  try {
    return await liveblocks.getRoom(roomId);
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function updateRoom(
  roomId: string,
  data: Parameters<typeof liveblocks.updateRoom>[1]
) {
  try {
    return await liveblocks.updateRoom(roomId, data);
  } catch (err) {
    console.log(err);
    return null;
  }
}

export async function createIssue() {
  const issueId = nanoid();
  const metadata: Metadata = {
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
