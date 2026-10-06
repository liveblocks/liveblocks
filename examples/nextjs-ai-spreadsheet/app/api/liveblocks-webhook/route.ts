import { NextResponse } from "next/server";
import { Liveblocks, WebhookHandler } from "@liveblocks/node";
import { reviewComment } from "@/lib/jev-review";

// Add your webhook secret from the project's webhooks dashboard. Point a
// `commentCreated` webhook at this endpoint to enable AI comment replies and
// the Jev-powered comment review (see lib/jev-review.ts).
const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET) {
    return new NextResponse("LIVEBLOCKS_WEBHOOK_SECRET_KEY is not set", {
      status: 500,
    });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = new WebhookHandler(WEBHOOK_SECRET).verifyRequest({
      headers: request.headers,
      rawBody,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Could not verify webhook call", { status: 400 });
  }

  // Every new human comment goes through the reviewer: an @mention of the AI
  // gets a direct reply (with tools); anything else is classified by Jev —
  // "Fix it" applies the recommended fix, a question gets an answer, "leave
  // it" resolves the thread — and checked for new issues.
  if (event.type === "commentCreated" && process.env.LIVEBLOCKS_SECRET_KEY) {
    const { roomId, threadId, commentId } = event.data;
    const liveblocks = new Liveblocks({
      secret: process.env.LIVEBLOCKS_SECRET_KEY,
    });
    try {
      await reviewComment(liveblocks, roomId, threadId, commentId);
    } catch (error) {
      console.error(error);
    }
  }

  return NextResponse.json({ ok: true });
}
