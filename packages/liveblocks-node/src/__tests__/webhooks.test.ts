import { Webhook } from "svix";

import { WebhookHandler } from "../webhooks";

describe("WebhookHandler", () => {
  const secret = "whsec_sFOoBaR78ZZNyOl0TxbObFZWeo3rLg+dA";

  const userEnteredHeaders = {
    "webhook-id": "msg_2KvLUhLIHZtzZnNgUWv3PhGYf5f",
    "webhook-timestamp": "1674850126",
  };

  const userEnteredBody = {
    data: {
      appId: "605a50b01a36d5ea7a2e9104",
      connectionId: 2196,
      enteredAt: "2023-01-27T20:08:40.693Z",
      numActiveUsers: 2,
      roomId: "hero-grid-12-01-2022",
      userId: "iepRYL2EWVHx8IcKVqhvZ6xljn",
      userInfo: null,
    },
    type: "userEntered",
  };

  const rawUserEnteredBody = JSON.stringify(userEnteredBody);

  const generateSignatureWithSvix = (
    secret: string,
    messageId: string,
    timestamp: string,
    body: string
  ) => {
    const webhookUtils = new Webhook(secret);
    return webhookUtils.sign(
      messageId,
      new Date(parseInt(timestamp, 10) * 1000),
      body
    );
  };

  it.each([undefined, null, "", "not_a_valid_secret"])(
    "initialization should throw an error if the secret is not valid",
    (invalidSecret) => {
      // @ts-expect-error: We want to test invalid secret
      expect(() => new WebhookHandler(invalidSecret)).toThrow();
    }
  );

  describe("verifyRequest", () => {
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should verify a "userEntered" event', () => {
      jest.useFakeTimers({
        now: 1674850126000,
      });
      const webhookHandler = new WebhookHandler(secret);

      const headers = {
        ...userEnteredHeaders,
        "webhook-signature": generateSignatureWithSvix(
          secret,
          userEnteredHeaders["webhook-id"],
          userEnteredHeaders["webhook-timestamp"],
          rawUserEnteredBody
        ),
      };

      const event = webhookHandler.verifyRequest({
        headers,
        rawBody: rawUserEnteredBody,
      });

      expect(event).toEqual(userEnteredBody);
    });

    it('should verify a "storageUpdated" event', () => {
      const storageUpdated = {
        data: {
          appId: "605a50b01a36d5ea7a2e9104",
          roomId: "hero-grid-12-01-2022",
          updatedAt: "2023-01-27T20:27:48.744Z",
        },
        type: "storageUpdated",
      };
      const rawStorageUpdated = JSON.stringify(storageUpdated);

      const headersStorageUpdated = {
        "webhook-id": "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
        "webhook-timestamp": "1674851522",
        "webhook-signature": generateSignatureWithSvix(
          secret,
          "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
          "1674851522",
          rawStorageUpdated
        ),
      };

      jest.useFakeTimers({
        now: 1674851522000,
      });

      const webhookHandler = new WebhookHandler(secret);

      const event = webhookHandler.verifyRequest({
        headers: headersStorageUpdated,
        rawBody: rawStorageUpdated,
      });

      expect(event).toEqual(storageUpdated);
    });

    it('should verify a "userLeft" event', () => {
      const userLeft = {
        data: {
          appId: "605a50b01a36d5ea7a2e9104",
          connectionId: 34597,
          leftAt: "2023-01-27T20:33:23.737Z",
          numActiveUsers: 4,
          roomId: "examples-hero-21-07-2022",
          userId: "zY8DF2NMqvKrzkuL5KkDIYY-da",
          userInfo: null,
        },
        type: "userLeft",
      };

      const rawUserLeft = JSON.stringify(userLeft);

      const headersUserLeft = {
        "webhook-id": "msg_2KvOUwNvJ8ozHKdSJRPdqJwSuiu",
        "webhook-timestamp": "1674851609",
        "webhook-signature": generateSignatureWithSvix(
          secret,
          "msg_2KvOUwNvJ8ozHKdSJRPdqJwSuiu",
          "1674851609",
          rawUserLeft
        ),
      };

      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1674851609000);

      const webhookHandler = new WebhookHandler(secret);

      const event = webhookHandler.verifyRequest({
        headers: headersUserLeft,
        rawBody: rawUserLeft,
      });

      expect(event).toEqual(userLeft);

      dateNowSpy.mockRestore();
    });

    it("should verify an event with multiple signatures", () => {
      jest.useFakeTimers({
        now: 1674850126000,
      });

      const webhookHandler = new WebhookHandler(secret);

      const anotherLegacySecret = "whsec_2KvOJ6yK9FO0hElL0JYkM3jPwBs";

      const signature = [
        generateSignatureWithSvix(
          secret,
          userEnteredHeaders["webhook-id"],
          userEnteredHeaders["webhook-timestamp"],
          rawUserEnteredBody
        ),
        generateSignatureWithSvix(
          anotherLegacySecret,
          userEnteredHeaders["webhook-id"],
          userEnteredHeaders["webhook-timestamp"],
          rawUserEnteredBody
        ),
      ].join(" ");

      const headers = {
        ...userEnteredHeaders,
        "webhook-signature": signature,
      };

      const event = webhookHandler.verifyRequest({
        headers,
        rawBody: rawUserEnteredBody,
      });

      expect(event).toEqual(userEnteredBody);
    });

    it("should throw if the signature is invalid", () => {
      jest.useFakeTimers({
        now: 1674850126000,
      });

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: {
            ...userEnteredHeaders,
            "webhook-signature": "v1,invalid_signature",
          },
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Invalid signature");
    });

    it("should throw if the timestamp is invalid", () => {
      jest.useFakeTimers({
        now: 1674850126000,
      });

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: {
            ...userEnteredHeaders,
            "webhook-signature": generateSignatureWithSvix(
              secret,
              userEnteredHeaders["webhook-id"],
              userEnteredHeaders["webhook-timestamp"],
              rawUserEnteredBody
            ),
            "webhook-timestamp": "invalid_timestamp",
          },
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Invalid timestamp");
    });

    it("should throw if timestamp is above future threshold", () => {
      const tenMinutesAgo = 1674850126000 - 10 * 60 * 1000;
      jest.useFakeTimers({
        now: tenMinutesAgo,
      });

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: {
            ...userEnteredHeaders,
            "webhook-signature": generateSignatureWithSvix(
              secret,
              userEnteredHeaders["webhook-id"],
              userEnteredHeaders["webhook-timestamp"],
              rawUserEnteredBody
            ),
          },
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Timestamp in the future");
    });

    it("should throw if timestamp is below past threshold", () => {
      const tenMinutesFromNow = 1674850126000 + 10 * 60 * 1000;
      jest.useFakeTimers({
        now: tenMinutesFromNow,
      });

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: {
            ...userEnteredHeaders,
            "webhook-signature": generateSignatureWithSvix(
              secret,
              userEnteredHeaders["webhook-id"],
              userEnteredHeaders["webhook-timestamp"],
              rawUserEnteredBody
            ),
          },
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Timestamp too old");
    });

    it("should throw if the event type is not supported", () => {
      jest.useFakeTimers({
        now: 1674851522000,
      });

      const body = {
        data: {
          appId: "605a50b01a36d5ea7a2e9104",
          roomId: "hero-grid-12-01-2022",
          updatedAt: "2023-01-27T20:27:48.744Z",
        },
        type: "unsupportedEventType",
      };

      const rawBody = JSON.stringify(body);

      const headers = {
        "webhook-id": "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
        "webhook-timestamp": "1674851522",
        "webhook-signature": generateSignatureWithSvix(
          secret,
          "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
          "1674851522",
          rawBody
        ),
      };

      const webhookHandler = new WebhookHandler(secret);

      expect(() =>
        webhookHandler.verifyRequest({
          headers,
          rawBody,
        })
      ).toThrowError(
        "Unknown event type, please upgrade to a higher version of @liveblocks/node"
      );
    });
  });
});
