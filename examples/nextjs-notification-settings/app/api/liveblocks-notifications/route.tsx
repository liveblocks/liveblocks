import {
  isThreadNotificationEvent,
  isTextMentionNotificationEvent,
  isCustomNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";

import { sendThreadNotification } from "./_notifications/thread-notification";
import { sendTextMentionNotification } from "./_notifications/text-mention-notification";
import { sendFileUploadedNotification } from "./_notifications/file-uploaded-notification";

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

  if (isThreadNotificationEvent(event)) {
    console.log("thread notification event");

    const response = await sendThreadNotification(liveblocks, event);
    return response;
  } else if (isTextMentionNotificationEvent(event)) {
    console.log("text mention notification event");

    const response = await sendTextMentionNotification(liveblocks, event);
    return response;
  } else if (
    isCustomNotificationEvent(event) &&
    event.data.kind === "$fileUploaded"
  ) {
    console.log("custom notification event");

    const response = await sendFileUploadedNotification(event);
    return response;
  }
  return new Response("Event type not used", {
    status: 200,
  });
}
