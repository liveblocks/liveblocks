import { NextRequest, NextResponse } from "next/server";
import { Liveblocks, WebhookHandler } from "@liveblocks/node";
import { formatDate, getMentionedIdsFromCommentBody, getPlainTextFromCommentBody } from "./utils";

const webhookHandler = new WebhookHandler(process.env.WEBHOOK_SECRET!);
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!
});

export async function POST(
  req: NextRequest,
) {
  try {
    const rawBody = await req.text()

    const event = webhookHandler.verifyRequest({
      headers: req.headers,
      rawBody,
    });
    switch (event.type) {
      case "commentCreated":
        const { commentId, createdAt, createdBy, roomId, threadId } = event.data

        console.log("LIVEBLOCKS_SECRET_KEY", process.env.LIVEBLOCKS_SECRET_KEY)
        const comment = await liveblocks.getComment({
          roomId,
          threadId,
          commentId
        })

        console.log(comment)

        const { participantIds } = await liveblocks.getThreadParticipants({
          roomId,
          threadId
        })

        let commentText = ''
        let mentionedIds: string[] = []

        if (comment.body) {
          commentText = getPlainTextFromCommentBody(comment.body)
          mentionedIds = getMentionedIdsFromCommentBody(comment.body)
        }

        const mentionNotification = {
          title: `${createdBy} mentioned you in a comment at ${formatDate(createdAt)}`,
          body: commentText,
        }

        const replyNotification = {
          title: `${createdBy} replied to a comment at ${formatDate(createdAt)}`,
          body: commentText,
        }

        for (const participantId of participantIds) {
          if (participantId === createdBy) {
            // We don't want to send a notification to the user who created the comment
          } else if (mentionedIds.includes(participantId)) {
            // We send a mention notification to the user or group that was mentioned
            console.log(mentionNotification)
          } else {
            // We send a reply notification to everyone else
            console.log({
              id: participantId,
              notification: replyNotification
            })
          }
        }
    }
  } catch (error: any) {
    console.log(error)
    return new NextResponse(error.message, { status: 400 });
  }

  return new NextResponse("OK", { status: 200 });
}
