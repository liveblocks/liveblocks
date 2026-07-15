/**
 * Reply to a comment in a flowchart document when the AI assistant is
 * @mentioned, editing the diagram with AI tools where needed and streaming
 * progress into a feed linked to the comment.
 *
 * Triggered by the `commentCreated` webhook (see
 * app/api/liveblocks-webhook/route.ts). Requires `AI_GATEWAY_API_KEY`.
 */
export async function replyToFlowchartComment(args: {
  roomId: string;
  threadId: string;
  commentId: string;
}): Promise<{ error?: string }> {
  // Implemented by the flowchart AI agent.
  void args;
  return {};
}
