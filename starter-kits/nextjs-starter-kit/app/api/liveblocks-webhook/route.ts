import {
  WebhookHandler,
  isCustomNotificationEvent,
  isTextMentionNotificationEvent,
  isThreadNotificationEvent,
} from "@liveblocks/node";
import { NextResponse } from "next/server";
import { addedToDocumentEmail } from "@/app/api/notifications/email/addedToDocumentEmail";
import { textMentionEmail } from "@/app/api/notifications/email/textMentionEmail";
import { threadEmail } from "@/app/api/notifications/email/threadEmail";
import { replyToFlowchartComment } from "@/lib/ai/flowchart/comment-agent";
import { replyToSpreadsheetComment } from "@/lib/ai/spreadsheet/comment-agent";
import { liveblocks } from "@/liveblocks.server.config";
import { DocumentRoomMetadata } from "@/types";

/**
 * A single webhook endpoint for the starter kit. Point a webhook at this
 * endpoint from your project's dashboard (https://liveblocks.io/dashboard)
 * and it will handle:
 *
 * - `commentCreated` — AI replies when the AI assistant is @mentioned in a
 *   comment on a spreadsheet or flowchart document.
 * - Notification events — email notifications, delegated to the handlers in
 *   app/api/notifications/email.
 *
 * This endpoint (and the AI assistant appearing in comment @mentions) is
 * enabled by setting `LIVEBLOCKS_WEBHOOK_SECRET_KEY` in .env.local.
 */
const WEBHOOK_SECRET_KEY = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET_KEY) {
    return new NextResponse(
      "Webhooks are not configured (set LIVEBLOCKS_WEBHOOK_SECRET_KEY in .env.local)",
      { status: 501 }
    );
  }

  const rawBody = await request.text();

  let event;
  try {
    // Verify if this is a real webhook request
    const webhookHandler = new WebhookHandler(WEBHOOK_SECRET_KEY);
    event = webhookHandler.verifyRequest({
      headers: request.headers,
      rawBody,
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Could not verify webhook call", { status: 400 });
  }

  // AI comment replies, when the AI assistant is @mentioned in a new comment
  if (event.type === "commentCreated") {
    const { roomId, threadId, commentId } = event.data;

    let room;
    try {
      room = await liveblocks.getRoom(roomId);
    } catch (err) {
      console.error(err);
      return new NextResponse("Could not fetch room", { status: 500 });
    }

    const metadata = room.metadata as DocumentRoomMetadata;

    try {
      switch (metadata.type) {
        case "spreadsheet":
          await replyToSpreadsheetComment(
            liveblocks,
            roomId,
            threadId,
            commentId
          );
          break;
        case "flowchart": {
          const result = await replyToFlowchartComment({
            roomId,
            threadId,
            commentId,
          });
          if (result.error) {
            console.error("[liveblocks-webhook commentCreated]", result.error);
          }
          break;
        }
        default:
          // No AI comment replies for the other document types
          break;
      }
    } catch (err) {
      console.error(err);
    }

    return NextResponse.json({ ok: true, handled: "commentCreated" });
  }

  // Email notifications, same handlers as app/api/notifications/email
  if (isThreadNotificationEvent(event)) {
    return await threadEmail(liveblocks, event);
  } else if (isTextMentionNotificationEvent(event)) {
    return await textMentionEmail(liveblocks, event);
  } else if (
    isCustomNotificationEvent(event) &&
    event.data.kind === "$addedToDocument"
  ) {
    return await addedToDocumentEmail(liveblocks, event);
  }

  return NextResponse.json({ ok: true, handled: "ignored" });
}
