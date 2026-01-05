import { type WebhookEvent, WebhookHandler } from "@liveblocks/node";

export type WebhookOptions = {
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
 *     // Handle the event
 *     // no need to return an acknowledgement response
 *   },
 * })
 */
export function Webhook(
  options: WebhookOptions
): (req: Request) => Promise<Response> {
  const webhookHandler = new WebhookHandler(options.webhookSecret);

  return async function (req: Request): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await req.json();
    const headers = req.headers;

    try {
      const event = webhookHandler.verifyRequest({
        headers,
        rawBody: JSON.stringify(body),
      });

      const promises: Promise<void>[] = [];
      if (options.onEvent) {
        promises.push(options.onEvent(event));
      }

      // TODO: add other handlers

      await Promise.all(promises);

      return new Response(null, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      return new Response(message, { status: 400 });
    }
  };
}
