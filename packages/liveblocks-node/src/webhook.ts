import crypto from "crypto";

export class WebhookHandler {
  secretBuffer: Buffer;
  constructor(secret: string) {
    if (!secret) throw new Error("Secret is required");
    if (typeof secret !== "string") throw new Error("Secret must be a string");

    const secretKey = secret.split("_")[1];
    if (!secretKey) throw new Error("Secret is invalid");
    this.secretBuffer = Buffer.from(secretKey, "base64");
  }

  verifyRequest(request: {
    headers: { [key: string]: string };
    rawBody: string;
  }): WebhookEvent {
    const webhookId = request.headers["webhook-id"];
    const timestamp = request.headers["webhook-timestamp"];

    const signedContent = `${webhookId}.${timestamp}.${request.rawBody}`;

    const signature = crypto
      .createHmac("sha256", this.secretBuffer)
      .update(signedContent)
      .digest("base64");

    /**
     * @example "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE= v1,bm9ldHUjKzFob2VudXRob2VodWUzMjRvdWVvdW9ldQo= v2,MzJsNDk4MzI0K2VvdSMjMTEjQEBAQDEyMzMzMzEyMwo="
     */
    const expectedSignatures = request.headers["webhook-signature"];

    if (expectedSignatures?.includes(signature) === false)
      throw new Error("Invalid signature");

    return JSON.parse(request.rawBody);
  }
}

export type WebhookEvent = StorageUpdatedEvent | UserEnteredEvent | UserLeftEvent;

export type StorageUpdatedEvent = {
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

export type UserEnteredEvent = {
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

export type UserLeftEvent = {
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
