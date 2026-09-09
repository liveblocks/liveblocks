/**
 * These utilities are used when deploying an example on liveblocks.io.
 * You can ignore them completely if you run the example locally.
 */

export function createExampleRoomId(workspaceId: string) {
  return `liveblocks:examples:nextjs-messaging-app:${workspaceId}`;
}
