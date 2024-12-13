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

  let event;

  try {
    // Verify if this is a real webhook request
    event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Couldn't verify webhook call", { status: 400 });
  }

  // Check if the event is a Thread Notification event
  if (isThreadNotificationEvent(event)) {
    let emailData;
    try {
      emailData = await prepareThreadNotificationEmailAsReact(
        liveblocks,
        event,
        {
          resolveUsers: async ({ userIds }) => {
            const users = getUsers(userIds);
            return users.map((user) => user?.info || {});
          },
          resolveRoomInfo: ({ roomId }) => {
            return {
              name: roomId,
              url: `https://my-liveblocks-app.com?roomId=${roomId}`,
            };
          },
          // And the magic to use `react-email` components happens here 🥳
          // Or you can use your own components if you're not using `react-email`
          // to customize comments' bodies' components.
          components: {
            Paragraph: ({ children }) => (
              <Text className="text-sm text-black m-0 mb-4">{children}</Text>
            ),
            Mention: ({ element, user }) => (
              <span className="text-email-accent font-medium">
                @{user?.name ?? element.id}
              </span>
            ),
          },
        }
      );
    } catch (err) {
      console.error(err);
      return new Response("Something went wrong", { status: 400 });
    }

    // If there are unread comments (last comment with mention or unread replies)
    if (emailData !== null) {
      const company = {
        name: "My Liveblocks App",
        url: "https://my-liveblocks-app.com",
        logoUrl: "https://liveblocks.io/apple-touch-icon.png",
      };
      const room = {
        name: emailData.roomInfo.name,
        url: emailData.roomInfo.url,
      };

      let email, subject;

      switch (emailData.type) {
        // Handle unread replies use case
        case "unreadReplies": {
          email = (
            <UnreadRepliesEmail
              company={company}
              room={room}
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
              company={company}
              room={room}
              comment={emailData.comment}
            />
          );
          subject = "You have one unread notification.";
          break;
        }
      }

      // Render your email's HTML
      const html = await render(email, { pretty: true });

      const { error } = await resend.emails.send({
        from: "My Liveblocks App <hello@my-liveblocks-app.com>",
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

      return new Response(null, { status: 200 });
    }

    return new Response("No email to send", { status: 200 });
  }

  return new Response(
    "Event type is not a notification event on thread data kind",
    {
      status: 200,
    }
  );
}
