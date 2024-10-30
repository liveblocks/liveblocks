import { prepareTextMentionNotificationEmailAsReact } from "@liveblocks/emails";
import {
  isTextMentionNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";

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
    console.log("event", event);

    // TODO complete example

    return new Response("No email to send", { status: 200 });
  }

  return new Response(
    "Event type is not a notification event on text mention data kind",
    {
      status: 200,
    }
  );
}
