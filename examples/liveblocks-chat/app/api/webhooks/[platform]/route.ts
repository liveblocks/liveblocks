import { after } from "next/server";
import { bot } from "@/app/bot";

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;

  // Check if we have a webhook handler for this platform
  const webhookHandler = bot.webhooks[platform as Platform];
  if (!webhookHandler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  // Handle the webhook with waitUntil for background processing
  // Next.js after() ensures work completes after the response is sent
  return webhookHandler(request, {
    waitUntil: (task) => after(() => task),
  });
}

// GET handler — serves as health check, but also forwards to webhook handler
// for platforms that need GET verification (e.g. WhatsApp challenge-response)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;

  const webhookHandler = bot.webhooks[platform as Platform];
  if (!webhookHandler) {
    return new Response(`${platform} adapter not configured`, { status: 404 });
  }

  // If the request has verification query params, forward to the adapter
  const url = new URL(request.url);
  if (
    url.searchParams.has("hub.mode") ||
    url.searchParams.has("hub.verify_token")
  ) {
    return webhookHandler(request);
  }

  return new Response(`${platform} webhook endpoint is active`, {
    status: 200,
  });
}
