import crypto from "crypto";

export class WebhookHandler {
  private secretBuffer: Buffer;
  constructor(
    /**
     * The signing secret provided on the webhooks page of the dashboard
     * @example "whsec_wPbvQ+u3VtN2e2tRPDKchQ1tBZ3svaHLm"
     */
    secret: string
  ) {
    if (!secret) throw new Error("Secret is required");
    if (typeof secret !== "string") throw new Error("Secret must be a string");

    const secretKey = secret.split("_")[1];
    if (!secretKey) throw new Error("Secret is invalid");

    this.secretBuffer = Buffer.from(secretKey, "base64");
  }

  /**
   * Verifies a webhook request and returns the event
   * @param request
   * @returns `WebhookEvent`
   */
  verifyRequest(request: WebhookRequest): WebhookEvent {
    const webhookId = request.headers["webhook-id"];
    const timestamp = request.headers["webhook-timestamp"];

    const signedContent = `${webhookId}.${timestamp}.${request.rawBody}`;

    const signature = crypto
      .createHmac("sha256", this.secretBuffer)
      .update(signedContent)
      .digest("base64");

    const rawSignatures = request.headers["webhook-signature"];

    if (!rawSignatures) throw new Error("Missing webhook-signature header");

    const expectedSignatures = rawSignatures
      .split(" ")
      .map((rawSignature) => {
        const [, signature] = rawSignature.split(",");
        return signature;
      })
      .filter(isNotUndefined);

    if (expectedSignatures.includes(signature) === false)
      throw new Error("Invalid signature");

    return JSON.parse(request.rawBody);
  }
}

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
  headers: { [key: string]: string };
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
