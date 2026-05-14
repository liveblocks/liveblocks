import {
  handleStorageUpdatedEvent,
  runAiReplyForCommentCreatedEvent,
} from "@/lib/liveblocks-webhook-handlers";
import { WebhookHandler } from "@liveblocks/node";
import { NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

// This route is called from the `storageUpdated` and `commentCreated` webhook events
// Learn how to set up webhooks on localhost:
// https://liveblocks.io/docs/guides/how-to-test-webhooks-on-localhost

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

  try {
    switch (event.type) {
      case "storageUpdated": {
        await handleStorageUpdatedEvent(event);
        return NextResponse.json({ ok: true, handled: "storageUpdated" });
      }
      case "commentCreated": {
        const result = await runAiReplyForCommentCreatedEvent(event);
        if (result.error) {
          console.error("[liveblocks-webhook commentCreated]", result.error);
        }
        return NextResponse.json({ ok: true, handled: "commentCreated" });
      }
      default:
        return NextResponse.json({ ok: true, handled: "ignored" });
    }
  } catch (error) {
    console.error("[liveblocks-webhook]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook handler failed",
      },
      { status: 400 }
    );
  }
}
