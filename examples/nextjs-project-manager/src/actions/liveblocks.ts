"use server";

import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { getRoomId, Metadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";

// export async function getRoom(roomId: string) {
//   try {
//     return await liveblocks.getRoom(roomId);
//   } catch (err) {
//     console.log(err);
//     return null;
//   }
// }
//
// export async function updateRoom(
//   roomId: string,
//   data: Parameters<typeof liveblocks.updateRoom>[1]
// ) {
//   try {
//     return await liveblocks.updateRoom(roomId, data);
//   } catch (err) {
//     console.log(err);
//     return null;
//   }
// }

export async function createIssue() {
  const issueId = nanoid();
  const metadata: Metadata = {
    issueId,
  };

  await liveblocks.createRoom(getRoomId(issueId), {
    defaultAccesses: ["room:write"],
    metadata,
  });

  redirect(`/issue/${issueId}`);
}

// export async function getRooms() {
//   console.log("start");
//   return (await liveblocks.getRooms()).data;
// }
