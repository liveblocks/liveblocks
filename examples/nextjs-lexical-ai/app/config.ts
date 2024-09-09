export function getRoomId(pageId: string) {
  return `liveblocks:examples:${pageId}`;
}

export function getPageId(roomId: string) {
  return roomId.split(":")[2];
}
