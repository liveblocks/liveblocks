import { NextRequest, NextResponse } from "next/server";
import { Liveblocks, WebhookHandler } from "@liveblocks/node";
import { formatDate, getPlainTextFromCommentBody } from "./utils";

const webhookHandler = new WebhookHandler(process.env.WEBHOOK_SECRET!);
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const event = webhookHandler.verifyRequest({
      headers: req.headers,
      rawBody,
    });

    switch (event.type) {
      case "commentCreated": {
        const { commentId, createdAt, createdBy, roomId, threadId } =
          event.data;

        const comment = await liveblocks.getComment({
          roomId,
          threadId,
          commentId,
        });

        if (comment.body === undefined) {
          break;
        }

        const { participantIds } = await liveblocks.getThreadParticipants({
          roomId,
          threadId,
        });

        const commentText = getPlainTextFromCommentBody(comment.body);

        for (const participantId of participantIds) {
          // We don't want to send a notification to the user who created the comment
          if (participantId !== createdBy) {
            console.log(
              `Notify @${participantId} that @${createdBy} commented at ${formatDate(
                createdAt
              )}.`
            );
            console.log(commentText);
          }
        }
      }
    }
  } catch (error: any) {
    console.log(error);
    return new NextResponse(null, { status: 400 });
  }

  return new NextResponse(null, { status: 200 });
}
