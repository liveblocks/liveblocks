import { Resend } from "resend";
import {
  CommentData,
  Liveblocks,
  stringifyCommentBody,
  ThreadData,
  NotificationEvent,
} from "@liveblocks/node";
import { getUser, getUsers } from "../../../database";
import NewComments, { CommentEmailInfo } from "../../../../emails/NewComments";

// Add your Resend API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY as string);

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

export async function notification({
  kind,
  channel,
  roomId,
  threadId,
  inboxNotificationId,
  userId,
  projectId,
  createdAt,
}: NotificationEvent["data"]): Promise<Response> {
  // Get info on the thread involved and the current inbox notification
  const [thread, inboxNotification] = await Promise.all([
    liveblocks.getThread({ roomId, threadId }),
    liveblocks.getInboxNotification({ inboxNotificationId, userId }),
  ]);

  const unreadComments = getUnreadComments(thread, inboxNotification.readAt);

  // No unread comments, no notification needed
  if (unreadComments.length === 0) {
    return new Response(null, { status: 200 });
  }

  // Convert comment bodies to plain HTML and return in format for NewComments email
  const htmlCommentBodies = await Promise.all(
    unreadComments.map(convertCommentToEmailFormat)
  );

  // Get the last user that left a comment
  const lastCommenter = await getUser(
    unreadComments[unreadComments.length - 1].userId
  );

  const title = lastCommenter
    ? `${lastCommenter.info.name} replied in Your App`
    : "New comments in Your App";

  // The URL of the page in your app. We're using this for email notification links.
  const roomUrl = `http://example.com?roomId=${roomId}`;

  // Generate an email with React Email
  const newCommentsEmail = (
    <NewComments title={title} href={roomUrl} comments={htmlCommentBodies} />
  );

  // Send email with Resend
  const { data, error } = await resend.emails.send({
    from: "Your App <yourapp@example.com>",
    to: userId, // In this example, user IDs are email addresses
    subject: title,
    react: newCommentsEmail,
  });

  if (error) {
    console.log(error);
    return new Response(JSON.stringify(error), {
      status: (error as any)?.statusCode || 500,
    });
  }

  return new Response(null, { status: 200 });
}

// Takes a comment and formats the body into HTML, and returns an easy format for NewComment to handle
async function convertCommentToEmailFormat(
  comment: CommentData
): Promise<CommentEmailInfo> {
  const html = await stringifyCommentBody(comment.body!, {
    format: "html",
    async resolveUsers({ userIds }) {
      const users = await getUsers(userIds);
      return users.map((user) => user?.info || {});
    },
  });

  const user = await getUser(comment.userId);
  const date = comment.createdAt;

  return { html, user, date };
}

// Returns any unread comments
function getUnreadComments(thread: ThreadData, readAt: Date | null) {
  return (
    thread.comments
      // Deleted comments
      .filter((comment) => comment.body !== undefined)
      // Comments that have already been read
      .filter((comment) => (readAt ? comment.createdAt > readAt : true))
  );
}
