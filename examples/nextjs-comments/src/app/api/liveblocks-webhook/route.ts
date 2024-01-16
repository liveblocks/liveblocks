import {
  CommentBody,
  CommentData,
  getMentionedIdsFromCommentBody,
  Liveblocks,
  stringifyCommentBody,
  ThreadData,
} from "@liveblocks/node";
import { WebhookHandler } from "@liveblocks/node";
import { Resend } from "resend";

// Add your Liveblocks secret key from the dashboard
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
  // @ts-expect-error
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev",
});

// Add your webhook secret key from a project's webhooks dashboard
const webhookHandler = new WebhookHandler(process.env.WEBHOOK_SECRET as string);

// Add your Resend API key
const resend = new Resend(process.env.RESEND_API_KEY as string);

export async function POST(request: Request) {
  const body = await request.json();
  const headers = request.headers;

  // Verify if this is a real webhook request
  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  if (event.type !== "threadEmailNotification") {
    return new Response("Event type not used", { status: 200 });
  }

  // Get thread, notification, participants
  const { roomId, threadId, inboxNotificationId, userId } = event.data;
  const [thread, inboxNotification, participants] = await Promise.all([
    liveblocks.getThread({ roomId, threadId }),
    liveblocks.getInboxNotification({ inboxNotificationId, userId }),
    liveblocks.getThreadParticipants({ roomId, threadId }),
  ]);

  const readAt = inboxNotification.readAt;

  // Comments since last read
  const comments = getCommentsSinceLastRead(thread, readAt);

  if (comments.length === 0) {
    // user read since event was sent
    return new Response("", { status: 200 });
  }

  // Get comment authors and mentionned users since last read
  const { authorIds, mentionedUserIds, allUserIds } = getUserIds(comments);

  const users = await resolveUsers({
    userIds: [...allUserIds],
  });

  // Prepare comments for email
  const stringifiedComments = await Promise.all(
    comments.map(async (comment) => {
      const body = await stringifyCommentBody(comment.body as CommentBody, {
        format: "html",
        resolveUsers: () => users,
      });
      return {
        body,
        authorId: comment.userId,
      };
    })
  );

  // Group HTML comments into thread for email
  const htmlComments = stringifiedComments.map((comment) => comment.body);
  const htmlThread = htmlComments.join("<hr />");

  const wasMentioned = mentionedUserIds.has(userId);
  const newCommentsNumber = comments.length;

  const url = `https://example.com/room/${roomId}?thread=${threadId}`;

  const linkToThread = `<a href="${url}">Go to thread</a>`;

  // Email HTML
  const emailHtml = `
    ${htmlThread}
    ${linkToThread}
  `;

  let subject = `There was activity on a thread with ${
    participants.participantIds.length - 1
  } participants`;

  if (wasMentioned) {
    subject = `${authorIds.size} people added ${newCommentsNumber} comments and you were mentioned in a thread`;
  }

  // Send email
  await resend.emails.send({
    from: "Liveblocks <notifications@dev.notifications.liveblocks.io>",
    to: ["__INSERT_USER_EMAIL_HERE__"],
    subject,
    html: emailHtml,
  });
  console.log("Email html", emailHtml);
  return new Response("", { status: 200 });
}

const resolveUsers = async (args: { userIds: string[] }) => {
  const users = await Promise.all(
    args.userIds.map((userId) => ({
      id: userId,
      name: `${userId}'s name`,
      avatar: `https://api.dicebear.com/7.x/bottts/jpg?seed=${userId}`,
      email: `${userId}@example.com`,
    }))
  );

  return users;
};

const getUserIds = (
  comments: CommentData[]
): {
  authorIds: Set<string>;
  mentionedUserIds: Set<string>;
  allUserIds: Set<string>;
} => {
  const authorIds = new Set<string>();
  const mentionedUserIds = new Set<string>();
  comments.forEach((comment) => {
    if (comment.body === undefined) return;

    authorIds.add(comment.userId);
    getMentionedIdsFromCommentBody(comment.body).forEach((userId) => {
      mentionedUserIds.add(userId);
    });
  });
  const allUserIds = new Set([...authorIds, ...mentionedUserIds]);

  return { authorIds, mentionedUserIds, allUserIds };
};

const getCommentsSinceLastRead = (thread: ThreadData, readAt: Date | null) => {
  return thread.comments
    .filter((comment) => {
      return readAt ? comment.createdAt > readAt : true;
    })
    .filter((comment) => {
      return comment.body !== undefined;
    });
};
