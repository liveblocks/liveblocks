import { runAiCommentReply } from "../../flowchart/agent/comment-agent";
import { WebhookHandler } from "@liveblocks/node";
import { NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      {
        error:
          "Webhook is not configured (set LIVEBLOCKS_WEBHOOK_SECRET_KEY in .env.local)",
      },
      { status: 501 }
    );
  }

  const webhookHandler = new WebhookHandler(WEBHOOK_SECRET);
  const body = await request.json();

  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers: request.headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  if (event.type === "commentCreated") {
    const { roomId, threadId, commentId } = event.data;

    const result = await runAiCommentReply({ roomId, threadId, commentId });

    if (result.error) {
      console.error("[liveblocks-webhook commentCreated]", result.error);
    }

    return NextResponse.json({ ok: true, handled: "commentCreated" });
  }

  return NextResponse.json({ ok: true, handled: "ignored" });
}
