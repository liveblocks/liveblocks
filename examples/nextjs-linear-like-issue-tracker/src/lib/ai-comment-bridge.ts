import { AI_USER_INFO } from "@/database";
import { liveblocks } from "@/liveblocks.server.config";
import { markdownToCommentBody } from "@liveblocks/node";

export type CommentLocation = {
  roomId: string;
  threadId: string;
  commentId: string;
};

// Placeholder comment whilst AI generates
export async function createAiPlaceholderComment({
  roomId,
  threadId,
  feedId,
}: {
  roomId: string;
  threadId: string;
  feedId: string;
}) {
  return await liveblocks.createComment({
    roomId,
    threadId,
    data: {
      userId: AI_USER_INFO.id,
      metadata: { feedId, feedComplete: false },
      body: markdownToCommentBody("Thinking…"),
    },
  });
}

// Updates the placeholder comment with AI response
export async function updateAiPlaceholderComment({
  roomId,
  threadId,
  commentId,
  feedId,
  response,
  referencedIssueIdsCsv,
}: CommentLocation & {
  feedId: string;
  response: string;
  referencedIssueIdsCsv?: string;
}) {
  const trimmed = response.trim();
  const body =
    trimmed.length === 0
      ? {
          version: 1 as const,
          content: [
            { type: "paragraph" as const, children: [{ text: "\u00a0" }] },
          ],
        }
      : markdownToCommentBody(trimmed);

  return await liveblocks.editComment({
    roomId,
    threadId,
    commentId,
    data: {
      metadata: {
        feedId,
        feedComplete: true,
        ...(referencedIssueIdsCsv !== undefined &&
        referencedIssueIdsCsv.length > 0
          ? { referencedIssueIds: referencedIssueIdsCsv }
          : {}),
      },
      body,
    },
  });
}
