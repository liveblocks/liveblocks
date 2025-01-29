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

// TODO add link to guide and more info

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
    return await threadEmail(liveblocks, event);
  } else if (isTextMentionNotificationEvent(event)) {
    return await textMentionEmail(liveblocks, event);
  } else if (
    isCustomNotificationEvent(event) &&
    event.data.kind === "$addedToDocument"
  ) {
    return await addedToDocumentEmail(event);
  }

  return new Response("Event type not used", {
    status: 200,
  });
}
