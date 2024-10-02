import { Resend } from "resend";
import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails";
import {
  isThreadNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";
import { Section, Text } from "@react-email/components";
import { render } from "@react-email/render";
import { getUsers } from "../../../database";
import { UnreadRepliesEmail } from "../../../../emails/UnreadRepliesEmail";
import { UnreadMentionEmail } from "../../../../emails/UnreadMention";

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
                url: `http://example.com?roomId=${roomId}`,
              };
            },
            commentBodyComponents: {
              Slot: ({ children }) => <Section>{children}</Section>,
              Paragraph: ({ children }) => <Text>{children}</Text>,
              Mention: ({ element, user }) => (
                <span>@{user?.name ?? element.id}</span>
              ),
            },
          }
        );

        // If there are unread comments (last comment with mention or unread replies)
        if (emailData !== null) {
          let email = <></>;

          switch (emailData.type) {
            // Handle unread replies use case
            case "unreadReplies": {
              email = <UnreadRepliesEmail />;
              break;
            }
            // Handle last unread comment with mention use case
            case "unreadMention": {
              email = <UnreadMentionEmail />;
              break;
            }
          }

          const html = await render(email, { pretty: true });

          const { error } = await resend.emails.send({
            from: "Your App <yourapp@example.com>",
            to: event.data.userId, // In this example, user IDs are email addresses,
            subject: "Unread notifications",
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
