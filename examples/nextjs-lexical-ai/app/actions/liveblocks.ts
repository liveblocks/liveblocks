"use server";

import { getRoomTitle } from "../lib/liveblocks";

export async function getRoomInfo(roomIds: string[]) {
  const promises = [];

  for (const roomId of roomIds) {
    promises.push(getRoomTitle(roomId));
  }

  const titles = await Promise.all(promises);
  return titles.map((title) => ({ name: title }));
}
