import { WebhookHandler } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { headers } from "next/headers";

// An example of a webhook endpoint that listens for Yjs changes
// You can use this setup to sync Yjs Storage data to your database
// https://liveblocks.io/docs/platform/webhooks

const API_KEY = process.env.LIVEBLOCKS_SECRET_KEY as string;

// Obtained from the webhook page inside a project
// https://liveblocks.io/dashboard
const webhookHandler = new WebhookHandler(API_KEY);

export async function POST(request: NextRequest) {
  const body = await request.json();
  let event;

  try {
    event = webhookHandler.verifyRequest({
      headers: headers() as any,
      rawBody: body,
    });
  } catch (err) {
    console.error(err);
    return new Response("Could not verify webhook call", { status: 400 });
  }

  // If Yjs Storage data has updated
  // https://liveblocks.io/docs/platform/webhooks#YDocUpdatedEvent
  if (event.type === "ydocUpdated") {
    const { roomId } = event.data;

    // Fetch Yjs Storage data from the Liveblocks REST API
    // https://liveblocks.io/docs/api-reference/rest-api-endpoints#get-rooms-roomId-ydoc
    const url = `https://api.liveblocks.io/v2/rooms/${roomId}/ydoc`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    if (!response.ok) {
      return new Response("Problem accessing Liveblocks REST APIs", {
        status: 500,
      });
    }

    // The Yjs Storage data
    const yjsDoc = await response.json();

    // Update your database with the current Yjs Storage data
    // ...
  }

  return new Response(null, { status: 200 });
}
