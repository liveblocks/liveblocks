import sendgridMail, { MailDataRequired } from "@sendgrid/mail";
import {
  prepareThreadNotificationEmailAsHTML,
  ThreadNotificationEmailDataAsHTML,
} from "@liveblocks/emails";
import {
  isThreadNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";
import { getUsers } from "../../../database";

// Set you Sendgrid API key
sendgridMail.setApiKey(process.env.SENDGRID_API_KEY as string);

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

// Add your webhook secret key from a project's webhooks dashboard
const webhookHandler = new WebhookHandler(
  process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY as string
);

type TemplateInfo = {
  templateId: string;
  dynamicTemplateData: { [key: string]: any };
  subject: string;
};
const getTemplate = (
  emailData: ThreadNotificationEmailDataAsHTML
): TemplateInfo => {
  switch (emailData.type) {
    // Handle unread replies use case
    case "unreadReplies":
      return {
        templateId: "d-my-unread-replies-template-id",
        dynamicTemplateData: { comments: emailData.comments },
        subject: `You have ${emailData.comments.length} unread notifications.`,
      };
    // Handle last unread comment with mention use case
    case "unreadMention":
      return {
        templateId: "d-my-unread-mention-template-id",
        dynamicTemplateData: { comment: emailData.comment },
        subject: "You have one unread notification.",
      };
  }
};

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
    return new Response("Couldn't verify hook call", { status: 400 });
  }

  // Check if the event is a Thread Notification event
  if (isThreadNotificationEvent(event)) {
    let emailData: ThreadNotificationEmailDataAsHTML | null = null;
    try {
      emailData = await prepareThreadNotificationEmailAsHTML(
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
          // Customize your HTML elements here 👇
          commentBodyStyles: {
            paragraph: "font-size:14px;margin:0",
            mention: "color:#1667FF;font-weight:500;",
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
      };

      const roomInfo = {
        name: emailData.roomInfo.name,
        url: emailData.roomInfo.url,
      };

      const { templateId, dynamicTemplateData, subject } =
        getTemplate(emailData);

      try {
        await sendgridMail.send({
          from: "My Liveblocks App <hello@my-liveblocks-app.com>",
          to: event.data.userId,
          templateId,
          subject,
          dynamicTemplateData: {
            company,
            roomInfo,
            ...dynamicTemplateData,
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

    return new Response("No email data to send", { status: 200 });
  }

  return new Response(
    "Event type is not a notification event on thread data kind",
    {
      status: 200,
    }
  );
}
