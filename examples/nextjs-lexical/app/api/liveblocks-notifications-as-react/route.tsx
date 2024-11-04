import { prepareTextMentionNotificationEmailAsReact } from "@liveblocks/emails";
import {
  isTextMentionNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";
import { Text } from "@react-email/components";
import { USER_INFO } from "../dummy-users";

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

  // Check if the event is Text Mention Notification event
  if (isTextMentionNotificationEvent(event)) {
    let emailData;

    try {
      emailData = await prepareTextMentionNotificationEmailAsReact(
        liveblocks,
        event,
        {
          resolveUsers: async ({ userIds }) => {
            const indices = [...USER_INFO.keys()];
            const users = new Map();

            for (const index of indices) {
              users.set(`user-${index}`, USER_INFO);
            }

            return userIds.map((userId) => users.get(userId)).filter(Boolean);
          },
          resolveRoomInfo: ({ roomId }) => {
            return {
              name: roomId,
              url: `https://my-liveblocks-app.com?roomId=${roomId}`,
            };
          },
          // And the magic to use `react-email` components happens here 🥳
          // Or you can use your own components if you're not using `react-email`
          // to customize mentions' components.
          components: {
            Container: ({ children }) => (
              <Text className="text-sm text-black m-0 mb-4">{children}</Text>
            ),
            Mention: ({ element, user }) => (
              <span className="text-email-accent font-medium">
                @{user?.name ?? element.userId}
              </span>
            ),
          },
        }
      );
    } catch (err) {
      console.error(err);
      return new Response("Something went wrong", { status: 400 });
    }

    console.log("emailData", emailData);
    if (emailData !== null) {
      // TODO complete example
      return new Response(null, { status: 200 });
    }

    return new Response("No email to send", { status: 200 });
  }

  return new Response(
    "Event type is not a notification event on text mention data kind",
    {
      status: 200,
    }
  );
}
