import {
  Liveblocks,
  type WebhookEvent,
  WebhookHandler,
} from "@liveblocks/node";

export type WebhookOptions = {
  /**
   * The Liveblocks secret key provided on the dashboard's API keys page
   * @example "sk_..."
   */
  liveblocksSecret: string;
  /**
   * The webhook signing secret provided on the dashboard's webhooks page
   * @example "whsec_wPbvQ+u3VtN2e2tRPDKchQ1tBZ3svaHLm"
   */
  webhookSecret: string;
  /**
   * Catch-all handler for any incoming Webhook event
   */
  onEvent?: (event: WebhookEvent) => Promise<void>;
};

/**
 * A simple utility which resolves incoming webhook payloads by signing the webhook secret properly.
 *
 * @example
 * import { Webhook } from "@liveblocks/nextjs";
 *
 * export const POST = Webhook({
 *   liveblocksSecret: process.env.LIVEBLOCKS_SECRET_KEY,
 *   webhookSecret: process.env.WEBHOOK_SECRET,
 *   onEvent: async (event) => {
 *     console.log(event);
 *   },
 * })
 */
export function Webhook(options: WebhookOptions) {
  const liveblocks = new Liveblocks({ secret: options.liveblocksSecret });
  const webhookHandler = new WebhookHandler(options.webhookSecret);

  return async function (req: Request): Promise<Response> {
    const body = await req.json();
    return new Response(null, { status: 200 });
  };
}
