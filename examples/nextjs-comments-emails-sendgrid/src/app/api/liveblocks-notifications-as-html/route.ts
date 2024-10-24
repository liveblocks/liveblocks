import sendgridMail from "@sendgrid/mail";
import { prepareThreadNotificationEmailAsHtml } from "@liveblocks/emails";
import {
  isThreadNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";

import { getUsers } from "../../../database";

/**
 * This webhook relies on SendGrid dynamic templates. Dynamic template allow you
 * to design email templates in the SendGrid dashboard, before calling the SDK
 * to send individual emails, passing custom parameters to each email.
 *
 * Learn more: https://www.twilio.com/docs/sendgrid/ui/sending-email/how-to-send-an-email-with-dynamic-templates
 */

// Set your Sendgrid API key
sendgridMail.setApiKey(process.env.SENDGRID_API_KEY as string);

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
      emailData = await prepareThreadNotificationEmailAsHtml(
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
              url: `https://my-liveblocks-app.com?roomId=${roomId}`,
            };
          },
          // Customize your HTML elements styles here 👇
          styles: {
            paragraph: {
              fontSize: "14px",
              margin: 0,
            },
            mention: {
              color: "#1667FF",
              fontWeight: 500,
            },
          },
        }
      );
    } catch (err) {
      console.error(err);
      return new Response("Something went wrong", { status: 400 });
    }

    // If there are unread comments (last comment with mention or unread replies)
    if (emailData !== null) {
      let templateId, subject, templateData;

      // Create your email objects for SendGrid dynamic template, passing on
      // any custom parameters
      switch (emailData.type) {
        // Handle unread replies use case
        case "unreadReplies": {
          templateId = "d-my-unread-replies-template-id"; // Your dynamic template ID
          templateData = {
            comments: emailData.comments,
          };
          subject = `You have ${emailData.comments.length} unread notifications.`;
          break;
        }
        // Handle last unread comment with mention use case
        case "unreadMention": {
          templateId = "d-my-unread-mention-template-id"; // Your dynamic template ID
          templateData = {
            comment: emailData.comment,
          };
          subject = "You have one unread notification.";
          break;
        }
      }

      // Send your dynamic email
      try {
        await sendgridMail.send({
          from: "My Liveblocks App <hello@my-liveblocks-app.com>",
          to: event.data.userId,
          templateId,
          subject,
          dynamicTemplateData: {
            company: {
              name: "My Liveblocks App",
              url: "https://my-liveblocks-app.com",
            },
            room: {
              name: emailData.roomInfo.name,
              url: emailData.roomInfo.url,
            },
            ...templateData,
          },
        });

        return new Response(null, { status: 200 });
      } catch (err) {
        console.log(err);
        return new Response(JSON.stringify(err), {
          status: 500,
        });
      }
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
