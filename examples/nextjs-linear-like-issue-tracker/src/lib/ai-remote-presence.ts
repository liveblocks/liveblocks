import { AI_USER_INFO } from "@/database";
import type { AiEditingPresenceType } from "@/lib/ai-editing-presence-types";
import { liveblocks } from "@/liveblocks.server.config";

// Show AI with just avatar
export async function showAiPresence(roomId: string): Promise<void> {
  await setAiRemotePresenceEditing(roomId, []);
}

// Make AI presence expire ASAP (2 secs)
export async function hideAiPresence(roomId: string): Promise<void> {
  await liveblocks.setPresence(roomId, {
    ttl: 2,
    userId: AI_USER_INFO.id,
    userInfo: { ...AI_USER_INFO.info },
    data: { editingTypes: [] },
  });
}

// Show what the AI is editing on the page
export async function setAiRemotePresenceEditing(
  roomId: string,
  editingTypes: AiEditingPresenceType[] | string[]
): Promise<void> {
  await liveblocks.setPresence(roomId, {
    userId: AI_USER_INFO.id,
    userInfo: { ...AI_USER_INFO.info },
    data: { editingTypes: [...editingTypes] },
    ttl: 15,
  });
}

// Add 👀 reaction to comment
export async function leaveAiReactionOnComment(loc: {
  roomId: string;
  threadId: string;
  commentId: string;
}): Promise<void> {
  await liveblocks.addCommentReaction({
    roomId: loc.roomId,
    threadId: loc.threadId,
    commentId: loc.commentId,
    data: { emoji: "👀", userId: AI_USER_INFO.id, createdAt: new Date() },
  });
}
