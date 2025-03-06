import {
  Liveblocks,
  WebhookHandler,
  isCustomNotificationEvent,
  isTextMentionNotificationEvent,
  isThreadNotificationEvent,
} from "@liveblocks/node";
import { addedToDocumentEmail } from "./addedToDocumentEmail";
import { textMentionEmail } from "./textMentionEmail";
import { threadEmail } from "./threadEmail";

// Learn more
// https://liveblocks.io/docs/guides/how-to-create-a-notification-settings-panel

// Add your Liveblocks secret key from https://liveblocks.io/dashboard/apiKeys
const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY as string,
});

// Add your webhook secret key from a project's webhooks dashboard
const WEBHOOK_SECRET_KEY = process.env.LIVEBLOCKS_WEBHOOK_SECRET_KEY;

export async function POST(request: Request) {
  if (!WEBHOOK_SECRET_KEY) {
    return new Response("To use email notifications, first set up webhooks", {
      status: 400,
    });
  }

  const body = await request.json();
  const headers = request.headers;

  let event;

  try {
    // Verify if this is a real webhook request
    const webhookHandler = new WebhookHandler(WEBHOOK_SECRET_KEY);
    event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Couldn't verify webhook call", { status: 400 });
  }

  if (isThreadNotificationEvent(event)) {
    return await threadEmail(liveblocks, event);
  } else if (isTextMentionNotificationEvent(event)) {
    return await textMentionEmail(liveblocks, event);
  } else if (
    isCustomNotificationEvent(event) &&
    event.data.kind === "$addedToDocument"
  ) {
    return await addedToDocumentEmail(liveblocks, event);
  }

  return new Response("Event type not used", {
    status: 200,
  });
}
