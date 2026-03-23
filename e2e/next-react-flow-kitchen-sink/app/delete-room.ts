"use server";

import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
  baseUrl: process.env.NEXT_PUBLIC_LIVEBLOCKS_BASE_URL!,
});

export async function deleteRoom(formData: FormData): Promise<void> {
  const roomId = formData.get("roomId");

  if (typeof roomId !== "string") {
    return;
  }

  await liveblocks.deleteRoom(roomId);
}
