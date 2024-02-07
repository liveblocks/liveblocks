import { Resend } from "resend";
import {
  CommentData,
  Liveblocks,
  stringifyCommentBody,
  ThreadData,
  ThreadEmailNotificationEvent,
} from "@liveblocks/node";
import { getUser, getUsers } from "@/database";
import NewComments, { CommentEmailInfo } from "../../../../emails/NewComments";
import { ThreadMetadata } from "@/liveblocks.config";

// Add your Resend API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY as string);

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
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
  // Get info on the thread involved, the current inbox notification, and the thread participants
  const [thread, inboxNotification, participants] = await Promise.all([
    liveblocks.getThread<ThreadMetadata>({ roomId, threadId }),
    liveblocks.getInboxNotification({ inboxNotificationId, userId }),
    liveblocks.getThreadParticipants({ roomId, threadId }),
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

  // Generate an email with React Email
  const newCommentsEmail = (
    <NewComments
      title={title}
      href={thread.metadata.url}
      comments={htmlCommentBodies}
    />
  );

  // Send email with Resend
  const { data, error } = await resend.emails.send({
    from: "Your App <yourapp@example.com>",
    to: participants.participantIds, // In this example, user IDs are email addresses
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
function getUnreadComments(
  thread: ThreadData<ThreadMetadata>,
  readAt: Date | null
) {
  return (
    thread.comments
      // Deleted comments
      .filter((comment) => comment.body !== undefined)
      // Comments that have already been read
      .filter((comment) => (readAt ? comment.createdAt > readAt : true))
  );
}
