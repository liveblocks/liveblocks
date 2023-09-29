import * as base64 from "@stablelib/base64";
import * as sha256 from "fast-sha256";
import type { IncomingHttpHeaders } from "http";

export class WebhookHandler {
  private secretBuffer: Buffer;
  private static secretPrefix = "whsec_";

  constructor(
    /**
     * The signing secret provided on the dashboard's webhooks page
     * @example "whsec_wPbvQ+u3VtN2e2tRPDKchQ1tBZ3svaHLm"
     */
    secret: string
  ) {
    if (!secret) throw new Error("Secret is required");
    if (typeof secret !== "string") throw new Error("Secret must be a string");

    if (secret.startsWith(WebhookHandler.secretPrefix) === false)
      throw new Error("Invalid secret, must start with whsec_");

    const secretKey = secret.slice(WebhookHandler.secretPrefix.length);
    this.secretBuffer = Buffer.from(secretKey, "base64");
  }

  /**
   * Verifies a webhook request and returns the event
   */
  public verifyRequest(request: WebhookRequest): WebhookEvent {
    const { webhookId, timestamp, rawSignatures } = this.verifyHeaders(
      request.headers
    );

    this.verifyTimestamp(timestamp);

    const signature = this.sign(`${webhookId}.${timestamp}.${request.rawBody}`);

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

    const event: WebhookEvent = JSON.parse(request.rawBody) as WebhookEvent;

    this.verifyWebhookEventType(event);

    return event;
  }

  /**
   * Verifies the headers and returns the webhookId, timestamp and rawSignatures
   */
  private verifyHeaders(headers: IncomingHttpHeaders | Headers) {
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
  private sign(content: string): string {
    const encoder = new TextEncoder();
    const toSign = encoder.encode(content);
    return base64.encode(sha256.hmac(this.secretBuffer, toSign));
  }

  /**
   * Verifies that the timestamp is not too old or in the future
   */
  private verifyTimestamp(timestampHeader: string) {
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
  private verifyWebhookEventType(
    event: WebhookEvent
  ): asserts event is WebhookEvent {
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
        "threadMetadataUpdated",
        "threadCreated",
        "ydocUpdated",
      ].includes(event.type)
    )
      return;

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

type WebhookEvent =
  | StorageUpdatedEvent
  | UserEnteredEvent
  | UserLeftEvent
  | RoomCreatedEvent
  | RoomDeletedEvent
  | CommentCreatedEvent
  | CommentEditedEvent
  | CommentDeletedEvent
  | ThreadMetadataUpdatedEvent
  | ThreadCreatedEvent
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

export type {
  CommentCreatedEvent,
  CommentDeletedEvent,
  CommentEditedEvent,
  CommentReactionAdded,
  CommentReactionRemoved,
  RoomCreatedEvent,
  RoomDeletedEvent,
  StorageUpdatedEvent,
  ThreadCreatedEvent,
  ThreadMetadataUpdatedEvent,
  UserEnteredEvent,
  UserLeftEvent,
  WebhookEvent,
  WebhookRequest,
  YDocUpdatedEvent,
};
