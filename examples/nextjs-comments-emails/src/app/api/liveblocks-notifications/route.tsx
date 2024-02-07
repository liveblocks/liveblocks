import { WebhookHandler } from "@liveblocks/node";
import { threadEmailNotification } from "./threadEmailNotification";

// Add your webhook secret key from a project's webhooks dashboard
const webhookHandler = new WebhookHandler(process.env.WEBHOOK_SECRET as string);

export async function POST(request: Request) {
  const body = await request.json();
  const headers = request.headers;

  // Verify if this is a real webhook request
  let event;
  try {
    event = webhookHandler.verifyRequest({
      headers: headers,
      rawBody: JSON.stringify(body),
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  if (event.type !== "threadEmailNotification") {
    return new Response("Event type not used", { status: 200 });
  }

  return await threadEmailNotification(event.data);
}
