import {
  CommentData,
  Liveblocks,
  stringifyCommentBody,
  ThreadData,
  ThreadEmailNotificationEvent,
} from "@liveblocks/node";

// Add your Liveblocks secret key from the dashboard
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function threadEmailNotification({
  roomId,
  threadId,
  inboxNotificationId,
  userId,
  projectId,
  createdAt,
}: ThreadEmailNotificationEvent["data"]): Promise<Response> {
  const [thread, inboxNotification, participants] = await Promise.all([
    liveblocks.getThread({ roomId, threadId }),
    liveblocks.getInboxNotification({ inboxNotificationId, userId }),
    liveblocks.getThreadParticipants({ roomId, threadId }),
  ]);

  const unreadComments = getUnreadComments(thread, inboxNotification.readAt);

  // No unread comments, no notification needed
  if (unreadComments.length === 0) {
    return new Response(null, { status: 200 });
  }

  const htmlCommentBodies = unreadComments.map((comment) =>
    stringifyCommentBody(comment.body!, { format: "html" })
  );

  console.log("SEND EMAIL");
  console.log(htmlCommentBodies);

  return new Response(null, { status: 200 });
}

function getUnreadComments(thread: ThreadData, readAt: Date | null) {
  return thread.comments
    .filter((comment) => comment.body !== undefined)
    .filter((comment) => (readAt ? comment.createdAt > readAt : true));
}
