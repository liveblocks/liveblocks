import {
  type StorageUpdatedEvent,
  type UserEnteredEvent,
  type UserLeftEvent,
  type WebhookEvent,
  WebhookHandler,
} from "@liveblocks/node";

export type WebhookOptions = {
  /**
   * The webhook signing secret provided on the dashboard's webhooks page.
   * @example "whsec_wPbvQ+u3VtN2e2tRPDKchQ1tBZ3svaHLm"
   */
  webhookSecret: string;
  /**
   * Catch-all handler for any incoming Webhook event.
   */
  onEvent?: (event: WebhookEvent) => Promise<void>;
  /**
   * Triggered when the storage of a room has been updated.
   */
  onStorageUpdated?: (event: StorageUpdatedEvent) => Promise<void>;
  /**
   * Triggered when a user entered a room.
   */
  onUserEntered?: (event: UserEnteredEvent) => Promise<void>;
  /**
   * Triggered when a user left a room.
   */
  onUserLeft?: (event: UserLeftEvent) => Promise<void>;
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

      switch (event.type) {
        case "storageUpdated": {
          if (options.onStorageUpdated) {
            promises.push(options.onStorageUpdated(event));
          }
          break;
        }
        case "userEntered": {
          if (options.onUserEntered) {
            promises.push(options.onUserEntered(event));
          }
          break;
        }
        case "userLeft": {
          if (options.onUserLeft) {
            promises.push(options.onUserLeft(event));
          }
          break;
        }
      }

      await Promise.all(promises);

      return new Response(null, { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      return new Response(message, { status: 400 });
    }
  };
}
