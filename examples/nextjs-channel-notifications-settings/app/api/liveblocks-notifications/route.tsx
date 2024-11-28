import {
  isThreadNotificationEvent,
  isTextMentionNotificationEvent,
  WebhookHandler,
  Liveblocks,
} from "@liveblocks/node";

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
    // Send thread kind notification email
    return new Response(null, { status: 200 });
  } else if (isTextMentionNotificationEvent(event)) {
    // Send text mention kind notification email
    return new Response(null, { status: 200 });
  }

  return new Response("Event type not used", {
    status: 200,
  });
}
