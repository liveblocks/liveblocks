import { WebhookHandler } from "../webhooks";

describe("WebhookHandler", () => {
  const secret = "INSERT_HERE";

  const userEnteredHeaders = {
    "webhook-id": "msg_2KvLUhLIHZtzZnNgUWv3PhGYf5f",
    "webhook-timestamp": "1674850126",
    "webhook-signature": "v1,1GrXvGm+9QKA1c01ZQ+7KOYbNleO4Ev/zfDDwo1WAPM=",
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

  it.each([undefined, null, "", "not_a_valid_secret"])(
    "initialization should throw an error if the secret is not provided",
    (invalidSecret) => {
      // @ts-expect-error: We want to test invalid secret
      expect(() => new WebhookHandler(invalidSecret)).toThrow();
    }
  );

  describe("verifyRequest", () => {
    it('should verify a "userEntered" event', () => {
      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1674850126000);

      const webhookHandler = new WebhookHandler(secret);

      const event = webhookHandler.verifyRequest({
        headers: userEnteredHeaders,
        rawBody: rawUserEnteredBody,
      });

      expect(event).toEqual(userEnteredBody);

      dateNowSpy.mockRestore();
    });

    it('should verify a "storageUpdated" event', () => {
      const headersStorageUpdated = {
        "webhook-id": "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
        "webhook-timestamp": "1674851522",
        "webhook-signature": "v1,WMFarHwdjZ0i6Ikfr2UecMFfgwGAY8WmmSZgdmx5w9M=",
      };

      const storageUpdated = {
        data: {
          appId: "605a50b01a36d5ea7a2e9104",
          roomId: "hero-grid-12-01-2022",
          updatedAt: "2023-01-27T20:27:48.744Z",
        },
        type: "storageUpdated",
      };

      const rawStorageUpdated = JSON.stringify(storageUpdated);

      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1674851522000);

      const webhookHandler = new WebhookHandler(secret);

      const event = webhookHandler.verifyRequest({
        headers: headersStorageUpdated,
        rawBody: rawStorageUpdated,
      });

      expect(event).toEqual(storageUpdated);

      dateNowSpy.mockRestore();
    });

    it('should verify a "userLeft" event', () => {
      const headersUserLeft = {
        "webhook-id": "msg_2KvOUwNvJ8ozHKdSJRPdqJwSuiu",
        "webhook-timestamp": "1674851609",
        "webhook-signature": "v1,kBjs3zOeRkb9C/Fa2QxLNGMnKDrio09/gjm8OkNooS4=",
      };
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

      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1674851609000);

      const webhookHandler = new WebhookHandler(secret);

      const event = webhookHandler.verifyRequest({
        headers: headersUserLeft,
        rawBody: rawUserLeft,
      });

      expect(event).toEqual(userLeft);

      dateNowSpy.mockRestore();
    });

    it("should verify a request and fail if the signature is invalid", () => {
      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1674850126000);

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

      dateNowSpy.mockRestore();
    });

    it("should verify a request and fail if the timestamp is invalid", () => {
      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(1674850126000);

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: {
            ...userEnteredHeaders,
            "webhook-timestamp": "invalid_timestamp",
          },
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Invalid timestamp");

      dateNowSpy.mockRestore();
    });

    it("should verify a request and fail if timestamp is above future threshold", () => {
      const tenMinutesAgo = 1674850126000 - 10 * 60 * 1000;
      const dateNowSpy = jest.spyOn(Date, "now").mockReturnValue(tenMinutesAgo);

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: userEnteredHeaders,
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Timestamp in the future");

      dateNowSpy.mockRestore();
    });

    it("should verify a request and fail if timestamp is below past threshold", () => {
      const tenMinutesFromNow = 1674850126000 + 10 * 60 * 1000;
      const dateNowSpy = jest
        .spyOn(Date, "now")
        .mockReturnValue(tenMinutesFromNow);

      const webhookHandler = new WebhookHandler(secret);
      expect(() =>
        webhookHandler.verifyRequest({
          headers: userEnteredHeaders,
          rawBody: rawUserEnteredBody,
        })
      ).toThrowError("Timestamp too old");

      dateNowSpy.mockRestore();
    });
  });
});
