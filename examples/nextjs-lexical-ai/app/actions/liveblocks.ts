"use server";

import { getRoomTitle } from "../lib/liveblocks";
import { getPageUrl } from "../config";

export async function getRoomInfo(roomIds: string[]) {
  const promises = [];

  for (const roomId of roomIds) {
    promises.push(getRoomTitle(roomId));
  }

  const titles = await Promise.all(promises);

  return titles.map((title, index) => ({
    name: title,
    url: getPageUrl(roomIds[index]),
  }));
}
