import crypto from "crypto";
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
        `Invalid signature, expected one of ${expectedSignatures}, got ${signature}`
      );

    const event = JSON.parse(request.rawBody);

    return event;
  }

  /**
   * Verifies the headers and returns the webhookId, timestamp and rawSignatures
   */
  private verifyHeaders(headers: IncomingHttpHeaders) {
    const sanitizedHeaders: IncomingHttpHeaders = {};
    Object.keys(headers).forEach((key) => {
      sanitizedHeaders[key.toLowerCase()] = headers[key];
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
    return crypto
      .createHmac("sha256", this.secretBuffer)
      .update(content)
      .digest("base64");
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
}

const WEBHOOK_TOLERANCE_IN_SECONDS = 5 * 60; // 5 minutes

const isNotUndefined = <T>(value: T | undefined): value is T =>
  value !== undefined;

type WebhookRequest = {
  /**
   * Headers of the request
   * @example
   * {
   *  "webhook-id": "123",
   *  "webhook-timestamp": "1614588800000",
   *  "webhook-signature": "v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo= v2,MzJsNDk4MzI0K2VvdSMjMTEjQEBAQDEyMzMzMzEyMwo="
   * }
   */
  headers: IncomingHttpHeaders;
  /**
   * Raw body of the request, do not parse it
   * @example '{"type":"storageUpdated","data":{"roomId":"my-room-id","appId":"my-app-id","updatedAt":"2021-03-01T12:00:00.000Z"}}'
   */
  rawBody: string;
};

type WebhookEvent = StorageUpdatedEvent | UserEnteredEvent | UserLeftEvent;

type StorageUpdatedEvent = {
  type: "storageUpdated";
  data: {
    roomId: string;
    appId: string;
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
    appId: string;
    roomId: string;
    connectionId: number;
    userId: string | null;
    userInfo: Record<string, unknown> | null;
    /**
     * ISO 8601 datestring
     * @example "2021-03-01T12:00:00.000Z"
     */
    enteredAt: string;
    numActiveUsers: number;
  };
};

type UserLeftEvent = {
  type: "userLeft";
  data: {
    appId: string;
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

export type {
  StorageUpdatedEvent,
  UserEnteredEvent,
  UserLeftEvent,
  WebhookEvent,
  WebhookRequest,
};
