import { start } from "workflow/api";
import { handleAiCommentReply } from "@/workflows/ai-comment-reply";
import { NextResponse } from "next/server";
import { WebhookHandler } from "@liveblocks/node";

// Add your webhook secret key from a project's webhooks dashboard
const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

if (!WEBHOOK_SECRET) {
  throw new Error("LIVEBLOCKS_WEBHOOK_SECRET_KEY is not set");
}

const webhookHandler = new WebhookHandler(WEBHOOK_SECRET);

export async function POST(request: Request) {
  const body = await request.json();
  const headers = request.headers;

  // Verify if this is a real webhook request
  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  if (event.type === "commentCreated") {
    const { roomId, threadId, commentId } = event.data;

    // Start AI workflow to reply to comment
    await start(handleAiCommentReply, [{ roomId, threadId, commentId }]);

    return NextResponse.json({
      message: "AI comment reply workflow started",
    });
  }

  return NextResponse.json({
    message: "Event type not used",
  });
}
