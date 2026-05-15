import { isDashboardCommentsRoomId } from "@/lib/comments/constants";
import { runDashboardCommentAiReply } from "@/lib/comment-ai/run-dashboard-comment-ai";
import { WebhookHandler } from "@liveblocks/node";
import { NextResponse } from "next/server";

export const maxDuration = 800;

const WEBHOOK_SECRET = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

const webhookHandler = WEBHOOK_SECRET
  ? new WebhookHandler(WEBHOOK_SECRET)
  : null;

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET || !webhookHandler) {
    return new NextResponse("Missing LIVEBLOCKS_WEBHOOK_SECRET_KEY", {
      status: 500,
    });
  }

  const rawBody = await request.text();
  const headers = request.headers;

  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers,
      rawBody,
    });
  } catch (err) {
    console.error(err);
    return new NextResponse("Could not verify webhook call", { status: 400 });
  }

  if (event.type !== "commentCreated") {
    return NextResponse.json({ message: "Event type not used" });
  }

  const { roomId, threadId, commentId } = event.data;

  if (!isDashboardCommentsRoomId(roomId)) {
    return NextResponse.json({ message: "Room not handled by this endpoint" });
  }

  const result = await runDashboardCommentAiReply({
    roomId,
    threadId,
    commentId,
  });

  if (result.error) {
    return NextResponse.json(
      { message: result.error },
      { status: result.status }
    );
  }

  return NextResponse.json({ message: result.body });
}
