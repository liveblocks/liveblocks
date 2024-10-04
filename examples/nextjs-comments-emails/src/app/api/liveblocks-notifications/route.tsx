import { Resend } from "resend";
import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails";
import {
  isThreadNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";
import { Text } from "@react-email/components";
import { render } from "@react-email/render";
import { getUsers } from "../../../database";
import UnreadRepliesEmail from "../../../../emails/UnreadReplies";
import UnreadMentionEmail from "../../../../emails/UnreadMention";

// Add your Resend API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY as string);

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

// Add your webhook secret key from a project's webhooks dashboard
const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY as string
);

export async function POST(request: Request) {
  const body = await request.json();
  const headers = request.headers;

  try {
    // Verify if this is a real webhook request
    const event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });

    // Check if the event is a Thread Notification event
    if (isThreadNotificationEvent(event)) {
      try {
        const emailData = await prepareThreadNotificationEmailAsReact(
          liveblocks,
          event,
          {
            resolveUsers: async ({ userIds }) => {
              const users = await getUsers(userIds);
              return users.map((user) => user?.info || {});
            },
            resolveRoomInfo: ({ roomId }) => {
              return {
                name: roomId,
                url: `https://example.com?roomId=${roomId}`,
              };
            },
            // And the magic to use `react-email` components happens here 🥳
            // Or you can use your own components.
            commentBodyComponents: {
              Paragraph: ({ children }) => (
                <Text className="text-sm">{children}</Text>
              ),
              Mention: ({ element, user }) => (
                <span>@{user?.name ?? element.id}</span>
              ),
            },
          }
        );

        // If there are unread comments (last comment with mention or unread replies)
        if (emailData !== null) {
          let email = <></>;
          let subject = "";

          const company = {
            name: "My App",
            url: "https://example.com",
          };

          const roomInfo = {
            name: emailData.roomInfo.name,
            url: emailData.roomInfo.url,
          };

          switch (emailData.type) {
            // Handle unread replies use case
            case "unreadReplies": {
              email = (
                <UnreadRepliesEmail
                  company={company}
                  roomInfo={roomInfo}
                  comments={emailData.comments}
                />
              );
              subject = `You have ${emailData.comments.length} unread notifications.`;
              break;
            }
            // Handle last unread comment with mention use case
            case "unreadMention": {
              email = (
                <UnreadMentionEmail
                // comment={emailData.comment}
                />
              );
              subject = "You have one unread notification.";
              break;
            }
          }

          const html = await render(email, { pretty: true });

          const { error } = await resend.emails.send({
            from: "Your App <yourapp@example.com>",
            to: event.data.userId, // In this example, user IDs are email addresses,
            subject,
            html,
          });

          if (error) {
            console.log(error);
            return new Response(JSON.stringify(error), {
              status: 500,
            });
          }
        }
        return new Response(null, { status: 200 });
      } catch (err) {
        console.error(err);
        return new Response("Something went wrong", { status: 400 });
      }
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Couldn't verify hook call", { status: 400 });
  }
}
