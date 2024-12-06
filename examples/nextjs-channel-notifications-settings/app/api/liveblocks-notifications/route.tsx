import { Resend } from "resend";
import { prepareThreadNotificationEmailAsReact } from "@liveblocks/emails";
import {
  isThreadNotificationEvent,
  isTextMentionNotificationEvent,
  WebhookHandler,
  Liveblocks,
  WebhookEvent,
  CustomNotificationEvent,
} from "@liveblocks/node";
import { Text } from "@react-email/components";
import { render } from "@react-email/render";

import UnreadMentionEmail from "../../../emails/UnreadMention";
import UnreadRepliesEmail from "../../../emails/UnreadReplies";

import { USER_INFO } from "../dummy-users";

// to be implemented in `@liveblocks/node`
const isCustomNotificationEvent = (
  event: WebhookEvent
): event is CustomNotificationEvent => {
  return event.type === "notification" && event.data.kind.startsWith("$");
};

// Add your Resend API key from https://resend.com/api-keys
const resend = new Resend(process.env.RESEND_API_KEY as string);

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
  // XXX
  // @ts-expect-error
  baseUrl: "https://dev.dev-liveblocks5948.workers.dev/",
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

  if (isThreadNotificationEvent(event)) {
    console.log("thread notification event");
    if (event.data.channel === "email") {
      let emailData;
      try {
        emailData = await prepareThreadNotificationEmailAsReact(
          liveblocks,
          event,
          {
            resolveUsers: async ({ userIds }) => {
              const indices = [...USER_INFO.keys()];
              const users = new Map();

              for (const index of indices) {
                users.set(`user-${index}`, USER_INFO[index]);
              }

              return userIds.map((userId) => users.get(userId)).filter(Boolean);
            },
            resolveRoomInfo: ({ roomId }) => {
              return {
                name: roomId,
                url: `http://localhost:3000/?exampleId=${roomId}`,
              };
            },
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

      if (emailData !== null) {
        const company = {
          name: "My Liveblocks App",
          url: "http://localhost:3000",
        };
        const room = {
          name: emailData.roomInfo.name,
          url: emailData.roomInfo.url,
        };

        let email, subject;

        switch (emailData.type) {
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

        const html = await render(email, { pretty: true });

        const { error } = await resend.emails.send({
          from: "Liveblocks <hello@dev.notifications.liveblocks.io>",
          // XXX
          // CHANGE WITH YOUR EMAIL
          to: "aurelien.dupaysdexemple+channel@liveblocks.io",
          subject,
          html,
        });

        if (error) {
          console.log(error);
          return new Response(JSON.stringify(error), {
            status: 500,
          });
        }

        return new Response("No email to send", { status: 200 });
      }
    } else if (event.data.channel === "slack") {
      // send slack notification
      return new Response(null, { status: 200 });
    }
  } else if (isTextMentionNotificationEvent(event)) {
    console.log("text mention notification event");
    // Send text mention kind notification email
    return new Response(null, { status: 200 });
  } else if (isCustomNotificationEvent(event)) {
    // send custom notification kind email
    console.log("custom notification event");
    return new Response(null, { status: 200 });
  }
  return new Response("Event type not used", {
    status: 200,
  });
}
