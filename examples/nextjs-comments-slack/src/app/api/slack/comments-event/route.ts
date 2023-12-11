import { WebhookHandler } from "@liveblocks/node";
import { createComment, createThread } from "./comments";

// Add your webhook secret key from a project's webhooks dashboard
const LIVEBLOCKS_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET_KEY as string;
const webhookHandler = new WebhookHandler(LIVEBLOCKS_WEBHOOK_SECRET);

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

  console.log(event.type);

  if (event.type === "threadCreated") {
    return await createThread(event);
  }

  if (event.type === "commentCreated") {
    return await createComment(event);
  }

  return new Response(null, { status: 200 });
}
