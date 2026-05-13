import { AI_USER_INFO } from "@/database";
import { liveblocks } from "@/liveblocks.server.config";

const AI_PRESENCE_TTL_SECONDS = 3599;

/**
 * Updates server-side AI presence in a room (no WebSocket). `editingTypes`
 * lists which parts of the issue UI the assistant is mutating. Tool handlers do
 * not reset this; `hidePresence` in the AI assistant clears it when the run ends.
 */
export async function setAiRemotePresenceEditing(
  roomId: string,
  editingTypes: string[]
): Promise<void> {
  await liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: { ...AI_USER_INFO.info },
    data: { editingTypes },
    ttl: AI_PRESENCE_TTL_SECONDS,
  });
}

/** Expire server-side AI presence in a room (same pattern as the assistant’s `hidePresence`). */
export async function clearAiPresenceInRoom(roomId: string): Promise<void> {
  await liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: { ...AI_USER_INFO.info },
    data: { editingTypes: [] },
  });
}
