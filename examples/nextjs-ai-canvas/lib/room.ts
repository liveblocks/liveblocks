export function getRoomId(fileId: string) {
  return `liveblocks:examples:nextjs-ai-canvas:${fileId}`;
}

export function getFeedId(fileId: string) {
  return `ai-feed-${fileId}`;
}
