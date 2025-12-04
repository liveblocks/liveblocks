import type { NotificationChannel } from "@liveblocks/core";
import * as base64 from "@stablelib/base64";
import * as sha256 from "fast-sha256";
import type { IncomingHttpHeaders } from "http";

import { isString } from "./utils";

export class WebhookHandler {
  #secretBuffer: Buffer;
  static #secretPrefix = "whsec_";

  constructor(
    /**
     * The signing secret provided on the dashboard's webhooks page
     * @example "whsec_wPbvQ+u3VtN2e2tRPDKchQ1tBZ3svaHLm"
     */
    secret: string
  ) {
    if (!secret) throw new Error("Secret is required");
    if (typeof secret !== "string") throw new Error("Secret must be a string");

    if (secret.startsWith(WebhookHandler.#secretPrefix) === false)
      throw new Error("Invalid secret, must start with whsec_");

    const secretKey = secret.slice(WebhookHandler.#secretPrefix.length);
    this.#secretBuffer = Buffer.from(secretKey, "base64");
  }

  /**
   * Verifies a webhook request and returns the event
   */
  public verifyRequest(request: WebhookRequest): WebhookEvent {
    const { headers, rawBody } = request;

    const { webhookId, timestamp, rawSignatures } =
      this.#verifyHeaders(headers);

    if (typeof rawBody !== "string") {
      throw new Error(
        `Invalid rawBody field, must be a string, got "${typeof rawBody}" instead. It is likely that you need to JSON.stringify the body before passing it.`
      );
    }

    this.#verifyTimestamp(timestamp);

    const signature = this.#sign(`${webhookId}.${timestamp}.${rawBody}`);

    const expectedSignatures = rawSignatures
      .split(" ")
      .map((rawSignature) => {
        const [, parsedSignature] = rawSignature.split(",");
        return parsedSignature;
      })
      .filter(isNotUndefined);

    if (expectedSignatures.includes(signature) === false)
      throw new Error(
        `Invalid signature, expected one of ${expectedSignatures.join(
          ", "
        )}, got ${signature}`
      );

    const event: WebhookEvent = JSON.parse(rawBody) as WebhookEvent;

    this.#verifyWebhookEventType(event);

    return event;
  }

  /**
   * Verifies the headers and returns the webhookId, timestamp and rawSignatures
   */
  #verifyHeaders(headers: IncomingHttpHeaders | Headers) {
    const usingNativeHeaders =
      typeof Headers !== "undefined" && headers instanceof Headers;
    const normalizedHeaders = usingNativeHeaders
      ? Object.fromEntries(headers)
      : (headers as IncomingHttpHeaders);

    const sanitizedHeaders: IncomingHttpHeaders = {};
    Object.keys(normalizedHeaders).forEach((key) => {
      sanitizedHeaders[key.toLowerCase()] = normalizedHeaders[key];
    });

    const webhookId = sanitizedHeaders["webhook-id"];
    if (typeof webhookId !== "string")
      throw new Error("Invalid webhook-id header");

    const timestamp = sanitizedHeaders["webhook-timestamp"];
    if (typeof timestamp !== "string")
      throw new Error("Invalid webhook-timestamp header");

    const rawSignatures = sanitizedHeaders["webhook-signature"];
    if (typeof rawSignatures !== "string")
      throw new Error("Invalid webhook-signature header");

    return { webhookId, timestamp, rawSignatures };
  }

  /**
   * Signs the content with the secret
   * @param content
   * @returns `string`
   */
  #sign(content: string): string {
    const encoder = new TextEncoder();
    const toSign = encoder.encode(content);
    return base64.encode(sha256.hmac(this.#secretBuffer, toSign));
  }

  /**
   * Verifies that the timestamp is not too old or in the future
   */
  #verifyTimestamp(timestampHeader: string) {
    const now = Math.floor(Date.now() / 1000);
    const timestamp = parseInt(timestampHeader, 10);

    if (isNaN(timestamp)) {
      throw new Error("Invalid timestamp");
    }

    // Check if timestamp is too old
    if (timestamp < now - WEBHOOK_TOLERANCE_IN_SECONDS) {
      throw new Error("Timestamp too old");
    }

    // Check if timestamp is in the future
    if (timestamp > now + WEBHOOK_TOLERANCE_IN_SECONDS) {
      throw new Error("Timestamp in the future");
    }
  }

  /**
   * Ensures that the event is a known event type
   * or throws and prompts the user to upgrade to a higher version of @liveblocks/node
   */
  #verifyWebhookEventType(event: WebhookEvent): asserts event is WebhookEvent {
    if (
      event &&
      event.type &&
      [
        "storageUpdated",
        "userEntered",
        "userLeft",
        "roomCreated",
        "roomDeleted",
        "commentCreated",
        "commentEdited",
        "commentDeleted",
        "commentReactionAdded",
        "commentReactionRemoved",
        "commentMetadataUpdated",
        "threadMetadataUpdated",
        "threadCreated",
        "threadDeleted",
        "ydocUpdated",
        "notification",
        "threadMarkedAsResolved",
        "threadMarkedAsUnresolved",
      ].includes(event.type)
    ) {
      if (event.type === "notification") {
        const notification = event;
        if (
          notification.data.kind === "thread" ||
          notification.data.kind === "textMention" ||
          isCustomKind(notification.data.kind)
        ) {
          return;
        } else {
          // Using JSON.stringify because `notification.data.kind`
          // is considered as `never` now because of the type guard.
          throw new Error(
            `Unknown notification kind: ${JSON.stringify(notification.data.kind)}`
          );
        }
      }

      return;
    }

    throw new Error(
      "Unknown event type, please upgrade to a higher version of @liveblocks/node"
    );
  }
}

const WEBHOOK_TOLERANCE_IN_SECONDS = 5 * 60; // 5 minutes

const isNotUndefined = <T>(value: T | undefined): value is T =>
  value !== undefined;

type WebhookRequest = {
  /**
   * Headers of the request, can be a regular object or a Headers object
   * @example
   * {
   *  "webhook-id": "123",
   *  "webhook-timestamp": "1614588800000",
   *  "webhook-signature": "v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo= v2,MzJsNDk4MzI0K2VvdSMjMTEjQEBAQDEyMzMzMzEyMwo="
   * }
   *
   * new Headers({
   *  "webhook-id": "123",
   *  "webhook-timestamp": "1614588800000",
   *  "webhook-signature": "v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo= v2,MzJsNDk4MzI0K2VvdSMjMTEjQEBAQDEyMzMzMzEyMwo="
   * }}
   */
  headers: IncomingHttpHeaders | Headers;
  /**
   * Raw body of the request, do not parse it
   * @example '{"type":"storageUpdated","data":{"roomId":"my-room-id","appId":"my-app-id","updatedAt":"2021-03-01T12:00:00.000Z"}}'
   */
  rawBody: string;
};

/**
 * When receiving an event we cannot define the `kind`
 * as member of the augmentation
 */
type CustomKind = `$${string}`;

const isCustomKind = (value: unknown): value is CustomKind => {
  return isString(value) && value.startsWith("$");
};

type WebhookEvent =
  | StorageUpdatedEvent
  | UserEnteredEvent
  | UserLeftEvent
  | RoomCreatedEvent
  | RoomDeletedEvent
  | CommentCreatedEvent
  | CommentEditedEvent
  | CommentDeletedEvent
  | CommentReactionAdded
  | CommentReactionRemoved
  | CommentMetadataUpdatedEvent
  | ThreadMetadataUpdatedEvent
  | NotificationEvent
  | ThreadCreatedEvent
  | ThreadDeletedEvent
  | ThreadMarkedAsResolvedEvent
  | ThreadMarkedAsUnresolvedEvent
  | YDocUpdatedEvent;

type StorageUpdatedEvent = {
  type: "storageUpdated";
  data: {
    roomId: string;
    projectId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedAt: string;
  };
};

type UserEnteredEvent = {
  type: "userEntered";
  data: {
    projectId: string;
    roomId: string;
    connectionId: number;
    userId: string | null;
    userInfo: Record<string, unknown> | null;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     * @description The time when the user entered the room.
     */
    enteredAt: string;
    numActiveUsers: number;
  };
};

type UserLeftEvent = {
  type: "userLeft";
  data: {
    projectId: string;
    roomId: string;
    connectionId: number;
    userId: string | null;
    userInfo: Record<string, unknown> | null;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     * @description The time when the user left the room.
     */
    leftAt: string;
    numActiveUsers: number;
  };
};

type RoomCreatedEvent = {
  type: "roomCreated";
  data: {
    projectId: string;
    roomId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    createdAt: string;
  };
};

type RoomDeletedEvent = {
  type: "roomDeleted";
  data: {
    projectId: string;
    roomId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    deletedAt: string;
  };
};

type CommentCreatedEvent = {
  type: "commentCreated";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    commentId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    createdAt: string;
    createdBy: string;
  };
};

type CommentEditedEvent = {
  type: "commentEdited";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    commentId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    editedAt: string;
  };
};

type CommentDeletedEvent = {
  type: "commentDeleted";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    commentId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    deletedAt: string;
  };
};

type CommentReactionAdded = {
  type: "commentReactionAdded";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    commentId: string;
    emoji: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    addedAt: string;
    addedBy: string;
  };
};

type CommentReactionRemoved = {
  type: "commentReactionRemoved";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    commentId: string;
    emoji: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    removedAt: string;
    removedBy: string;
  };
};

type YDocUpdatedEvent = {
  type: "ydocUpdated";
  data: {
    projectId: string;
    roomId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedAt: string;
  };
};

type ThreadMetadataUpdatedEvent = {
  type: "threadMetadataUpdated";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    updatedAt: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedBy: string;
  };
};

type CommentMetadataUpdatedEvent = {
  type: "commentMetadataUpdated";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    commentId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedAt: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedBy: string;
  };
};

type ThreadCreatedEvent = {
  type: "threadCreated";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    createdAt: string;
    createdBy: string;
  };
};

type ThreadDeletedEvent = {
  type: "threadDeleted";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    deletedAt: string;
  };
};

type ThreadMarkedAsResolvedEvent = {
  type: "threadMarkedAsResolved";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    updatedAt: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedBy: string;
  };
};

type ThreadMarkedAsUnresolvedEvent = {
  type: "threadMarkedAsUnresolved";
  data: {
    projectId: string;
    roomId: string;
    threadId: string;
    updatedAt: string;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    updatedBy: string;
  };
};

type ThreadNotificationEvent = {
  type: "notification";
  data: {
    channel: NotificationChannel;
    kind: "thread";
    projectId: string;
    roomId: string;
    userId: string;
    threadId: string;
    inboxNotificationId: string;
    /**
     * Date representing the time when the webhook event was created.
     *
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    createdAt: string;
    /**
     * Date representing the  time when the notification was created.
     *
     * ISO 8601 datestring
     * @example "2021-03-01T18:00:00.000Z"
     */
    triggeredAt: string;
  };
};

type TextMentionNotificationEvent = {
  type: "notification";
  data: {
    channel: NotificationChannel;
    kind: "textMention";
    projectId: string;
    roomId: string;
    userId: string;
    mentionId: string;
    inboxNotificationId: string;
    /**
     * Date representing the time when the webhook event was created.
     *
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    createdAt: string;
    /**
     * Date representing the  time when the notification was created.
     *
     * ISO 8601 datestring
     * @example "2021-03-01T18:00:00.000Z"
     */
    triggeredAt: string;
  };
};

type CustomNotificationEvent = {
  type: "notification";
  data: {
    channel: NotificationChannel;
    kind: CustomKind;
    projectId: string;
    roomId: string | null;
    userId: string;
    subjectId: string;
    inboxNotificationId: string;
    /**
     * Date representing the time when the webhook event was created.
     *
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    createdAt: string;
    /**
     * Date representing the  time when the notification was created.
     *
     * ISO 8601 datestring
     * @example "2021-03-01T18:00:00.000Z"
     */
    triggeredAt: string;
  };
};

type NotificationEvent =
  | ThreadNotificationEvent
  | TextMentionNotificationEvent
  | CustomNotificationEvent;

export type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentMetadataUpdatedEvent,
  CommentReactionAdded,
  CommentReactionRemoved,
  CustomNotificationEvent,
  NotificationEvent,
  RoomCreatedEvent,
  RoomDeletedEvent,
  StorageUpdatedEvent,
  TextMentionNotificationEvent,
  ThreadCreatedEvent,
  ThreadDeletedEvent,
  ThreadMarkedAsResolvedEvent,
  ThreadMarkedAsUnresolvedEvent,
  ThreadMetadataUpdatedEvent,
  ThreadNotificationEvent,
  UserEnteredEvent,
  UserLeftEvent,
  WebhookEvent,
  WebhookRequest,
  YDocUpdatedEvent,
};

/**
 * Type guard to check if a webhook event is a `ThreadNotificationEvent`
 *
 * The check is made against the event type and event data kind.
 * You should use this guard to safely check the webhook event you received
 * when you're expecting a `ThreadNotificationEvent`.
 *
 * @param event The webhook event received after calling `webhookHandler.verifyRequest()`.
 * @returns A boolean type predicate.
 */
export function isThreadNotificationEvent(
  event: WebhookEvent
): event is ThreadNotificationEvent {
  return event.type === "notification" && event.data.kind === "thread";
}

/**
 * Type guard to check if a webhook event is a `TextMentionNotificationEvent`
 *
 * The check is made against the event type and event data kind.
 * You should use this guard to safely check the webhook event you received
 * when you're expecting a `TextMentionNotificationEvent`.
 *
 * @param event The webhook event received after calling `webhookHandler.verifyRequest()`.
 * @returns A boolean type predicate.
 */
export function isTextMentionNotificationEvent(
  event: WebhookEvent
): event is TextMentionNotificationEvent {
  return event.type === "notification" && event.data.kind === "textMention";
}

/**
 * Type guard to check if a webhook event is a `CustomNotificationEvent`
 *
 * The check is made against the event type and event data kind.
 * You should use this guard to safely check the webhook event you received
 * when you're expecting a `CustomNotificationEvent`.
 *
 * @param event The webhook event received after calling `webhookHandler.verifyRequest()`.
 * @returns A boolean type predicate.
 */
export function isCustomNotificationEvent(
  event: WebhookEvent
): event is CustomNotificationEvent {
  return event.type === "notification" && isCustomKind(event.data.kind);
}
