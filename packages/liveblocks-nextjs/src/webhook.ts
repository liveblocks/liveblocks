import {
  type CommentCreatedEvent,
  type CommentDeletedEvent,
  type CommentEditedEvent,
  type CommentReactionAdded,
  type CommentReactionRemoved,
  type CustomNotificationEvent,
  isCustomNotificationEvent,
  isTextMentionNotificationEvent,
  isThreadNotificationEvent,
  type RoomCreatedEvent,
  type RoomDeletedEvent,
  type StorageUpdatedEvent,
  type TextMentionNotificationEvent,
  type ThreadCreatedEvent,
  type ThreadDeletedEvent,
  type ThreadMarkedAsResolvedEvent,
  type ThreadMarkedAsUnresolvedEvent,
  type ThreadMetadataUpdatedEvent,
  type ThreadNotificationEvent,
  type UserEnteredEvent,
  type UserLeftEvent,
  type WebhookEvent,
  WebhookHandler,
  type YDocUpdatedEvent,
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
  /**
   * Triggered when a room was created.
   */
  onRoomCreated?: (event: RoomCreatedEvent) => Promise<void>;
  /**
   * Triggered when a room was deleted.
   */
  onRoomDeleted?: (event: RoomDeletedEvent) => Promise<void>;
  /**
   * Triggered when a comment was created.
   */
  onCommentCreated?: (event: CommentCreatedEvent) => Promise<void>;
  /**
   * Triggered when a comment was edited.
   */
  onCommentEdited?: (event: CommentEditedEvent) => Promise<void>;
  /**
   * Triggered when a comment was deleted.
   */
  onCommentDeleted?: (event: CommentDeletedEvent) => Promise<void>;
  /**
   * Triggered when a comment reaction was added.
   */
  onCommentReactionAdded?: (event: CommentReactionAdded) => Promise<void>;
  /**
   * Triggered when a comment reaction was removed.
   */
  onCommentReactionRemoved?: (event: CommentReactionRemoved) => Promise<void>;
  /**
   * Triggered when a Yjs document of a room was updated.
   */
  onYDocUpdated?: (event: YDocUpdatedEvent) => Promise<void>;
  /**
   * Triggered when a thread metadata was updated.
   */
  onThreadMetadataUpdated?: (
    event: ThreadMetadataUpdatedEvent
  ) => Promise<void>;
  /**
   * Triggered when a thread was created.
   */
  onThreadCreated?: (event: ThreadCreatedEvent) => Promise<void>;
  /**
   * Triggered when a thread was deleted.
   */
  onThreadDeleted?: (event: ThreadDeletedEvent) => Promise<void>;
  /**
   * Triggered when a thread was marked as resolved.
   */
  onThreadMarkedAsResolved?: (
    event: ThreadMarkedAsResolvedEvent
  ) => Promise<void>;
  /**
   * Triggered when a thread was marked as unresolved.
   */
  onThreadMarkedAsUnresolved?: (
    event: ThreadMarkedAsUnresolvedEvent
  ) => Promise<void>;
  /**
   * Triggered when a thread notification was created.
   */
  onThreadNotification?: (event: ThreadNotificationEvent) => Promise<void>;
  /**
   * Triggered when a text mention notification was created.
   */
  onTextMentionNotification?: (
    event: TextMentionNotificationEvent
  ) => Promise<void>;
  /**
   * Triggered when a custom notification was created.
   */
  onCustomNotification?: (event: CustomNotificationEvent) => Promise<void>;
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
        case "roomCreated": {
          if (options.onRoomCreated) {
            promises.push(options.onRoomCreated(event));
          }
          break;
        }
        case "roomDeleted": {
          if (options.onRoomDeleted) {
            promises.push(options.onRoomDeleted(event));
          }
          break;
        }
        case "commentCreated": {
          if (options.onCommentCreated) {
            promises.push(options.onCommentCreated(event));
          }
          break;
        }
        case "commentEdited": {
          if (options.onCommentEdited) {
            promises.push(options.onCommentEdited(event));
          }
          break;
        }
        case "commentDeleted": {
          if (options.onCommentDeleted) {
            promises.push(options.onCommentDeleted(event));
          }
          break;
        }
        case "commentReactionAdded": {
          if (options.onCommentReactionAdded) {
            promises.push(options.onCommentReactionAdded(event));
          }
          break;
        }
        case "commentReactionRemoved": {
          if (options.onCommentReactionRemoved) {
            promises.push(options.onCommentReactionRemoved(event));
          }
          break;
        }
        case "ydocUpdated": {
          if (options.onYDocUpdated) {
            promises.push(options.onYDocUpdated(event));
          }
          break;
        }
        case "threadMetadataUpdated": {
          if (options.onThreadMetadataUpdated) {
            promises.push(options.onThreadMetadataUpdated(event));
          }
          break;
        }
        case "threadCreated": {
          if (options.onThreadCreated) {
            promises.push(options.onThreadCreated(event));
          }
          break;
        }
        case "threadDeleted": {
          if (options.onThreadDeleted) {
            promises.push(options.onThreadDeleted(event));
          }
          break;
        }
        case "threadMarkedAsResolved": {
          if (options.onThreadMarkedAsResolved) {
            promises.push(options.onThreadMarkedAsResolved(event));
          }
          break;
        }
        case "threadMarkedAsUnresolved": {
          if (options.onThreadMarkedAsUnresolved) {
            promises.push(options.onThreadMarkedAsUnresolved(event));
          }
          break;
        }
        case "notification": {
          if (
            isThreadNotificationEvent(event) &&
            options.onThreadNotification
          ) {
            promises.push(options.onThreadNotification(event));
          } else if (
            isTextMentionNotificationEvent(event) &&
            options.onTextMentionNotification
          ) {
            promises.push(options.onTextMentionNotification(event));
          } else if (
            isCustomNotificationEvent(event) &&
            options.onCustomNotification
          ) {
            promises.push(options.onCustomNotification(event));
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
