import { Liveblocks } from "@liveblocks/node";

/**
 * Reply to a comment in a spreadsheet document when the AI assistant is
 * @mentioned, editing the sheet with AI tools where needed.
 *
 * Triggered by the `commentCreated` webhook (see
 * app/api/liveblocks-webhook/route.ts). Requires `AI_GATEWAY_API_KEY`.
 */
export async function replyToSpreadsheetComment(
  liveblocks: Liveblocks,
  roomId: string,
  threadId: string,
  commentId: string
): Promise<void> {
  // Implemented by the spreadsheet AI server tools.
  void liveblocks;
  void roomId;
  void threadId;
  void commentId;
}
