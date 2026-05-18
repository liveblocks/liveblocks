export const COMMENTS_ROOM_ID_BASE =
  "liveblocks:examples:nextjs-ai-dashboard-reports-comments";

export function isDashboardCommentsRoomId(roomId: string) {
  return (
    roomId === COMMENTS_ROOM_ID_BASE ||
    roomId.startsWith(`${COMMENTS_ROOM_ID_BASE}-`)
  );
}
