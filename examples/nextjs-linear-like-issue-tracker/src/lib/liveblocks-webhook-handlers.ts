import type { WebhookEvent } from "@liveblocks/node";
import { Metadata } from "@/config";
import { liveblocks } from "@/liveblocks.server.config";
import { runAiIssueAssistant } from "@/lib/ai-issue-assistant";

type StorageUpdatedWebhookEvent = Extract<
  WebhookEvent,
  { type: "storageUpdated" }
>;

type CommentCreatedWebhookEvent = Extract<
  WebhookEvent,
  { type: "commentCreated" }
>;

// Syncs issue fields from Storage into room metadata
export async function handleStorageUpdatedEvent(
  event: StorageUpdatedWebhookEvent
): Promise<void> {
  const { roomId } = event.data;

  const { meta, properties, labels } = await liveblocks.getStorageDocument(
    roomId,
    "json"
  );

  const metadata: Partial<Metadata> = {
    title: meta.title,
    progress: properties.progress,
    priority: properties.priority,
    assignedTo: properties.assignedTo,
    labels: labels as string[],
  };

  await liveblocks.updateRoom(roomId, { metadata });
}

/** Runs the issue AI assistant when a new comment is created (e.g. @mention). */
export function runAiReplyForCommentCreatedEvent(
  event: CommentCreatedWebhookEvent
) {
  const { roomId, threadId, commentId } = event.data;
  return runAiIssueAssistant({ roomId, threadId, commentId });
}
