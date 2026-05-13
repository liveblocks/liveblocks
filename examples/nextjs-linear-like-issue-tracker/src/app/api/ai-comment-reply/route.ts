import { runAiIssueAssistant } from "@/lib/ai-issue-assistant";
import { WebhookHandler } from "@liveblocks/node";
import { after } from "next/server";
import { NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "AI webhook is not configured (set LIVEBLOCKS_WEBHOOK_SECRET_KEY)" },
      { status: 501 }
    );
  }

  const webhookHandler = new WebhookHandler(WEBHOOK_SECRET);
  const body = await request.json();
  const headers = request.headers;

  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  if (event.type === "commentCreated") {
    const { roomId, threadId, commentId } = event.data;

    after(() => {
      void runAiIssueAssistant({ roomId, threadId, commentId }).then(
        (result) => {
          if (result.error) {
            console.error("[ai-comment-reply]", result.error);
          }
        },
        (err) => {
          console.error("[ai-comment-reply]", err);
        }
      );
    });

    return NextResponse.json({
      message: "AI comment reply started",
    });
  }

  return NextResponse.json({
    message: "Event type not used",
  });
}
