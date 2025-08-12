import { Webhook } from "svix";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  isCustomNotificationEvent,
  isTextMentionNotificationEvent,
  isThreadNotificationEvent,
  type WebhookEvent,
  WebhookHandler,
} from "../webhooks";

describe("WebhookHandler", () => {
  const secret = "whsec_sFOoBaR78ZZNyOl0TxbObFZWeo3rLg+dA";

  const userEnteredHeaders = {
    "webhook-id": "msg_2KvLUhLIHZtzZnNgUWv3PhGYf5f",
    "webhook-timestamp": "1674850126",
  };

  const userEnteredBody = {
    data: {
      projectId: "605a50b01a36d5ea7a2e9104",
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

  test.each([undefined, null, "", "not_a_valid_secret"])(
    "initialization should throw an error if the secret is not valid",
    (invalidSecret) => {
      // @ts-expect-error: We want to test invalid secret
      expect(() => new WebhookHandler(invalidSecret)).toThrow();
    }
  );

  describe("verifyRequest", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test.each([
      ["userEntered", userEnteredBody],
      [
        "storageUpdated",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          roomId: "hero-grid-12-01-2022",
          updatedAt: "2023-01-27T20:27:48.744Z",
        },
      ],
      [
        "userLeft",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          connectionId: 34597,
          leftAt: "2023-01-27T20:33:23.737Z",
          numActiveUsers: 4,
          roomId: "examples-hero-21-07-2022",
          userId: "zY8DF2NMqvKrzkuL5KkDIYY-da",
          userInfo: null,
        },
      ],
      [
        "roomCreated",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          createdAt: "2023-01-27T20:33:23.737Z",
          roomId: "examples-hero-21-07-2022",
        },
      ],
      [
        "roomDeleted",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          deletedAt: "2023-01-27T20:33:23.737Z",
          roomId: "examples-hero-21-07-2022",
        },
      ],
      [
        "commentCreated",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          commentId: "605a50b01a36d5ea7a2e9104",
          content: "Hello world",
          createdAt: "2023-01-27T20:33:23.737Z",
          createdBy: "authorId",
          roomId: "examples-hero-21-07-2022",
        },
      ],
      [
        "commentDeleted",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          commentId: "605a50b01a36d5ea7a2e9104",
          deletedAt: "2023-01-27T20:33:23.737Z",
          roomId: "examples-hero-21-07-2022",
        },
      ],
      [
        "commentEdited",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          commentId: "605a50b01a36d5ea7a2e9104",
          content: "Hello world",
          editedAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "commentReactionAdded",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          commentId: "605a50b01a36d5ea7a2e9104",
          emoji: "👍",
          roomId: "examples-hero-21-07-2022",
        },
      ],
      [
        "commentReactionRemoved",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          commentId: "605a50b01a36d5ea7a2e9104",
          emoji: "👍",
          roomId: "examples-hero-21-07-2022",
        },
      ],
      [
        "threadMetadataUpdated",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          updatedBy: "authorId",
          updatedAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "threadCreated",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          createdBy: "authorId",
          createdAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "threadDeleted",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          deletedAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "notification",
        {
          kind: "thread",
          channel: "email",
          projectId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          inboxNotificationId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          userId: "userId",
          createdAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "notification",
        {
          kind: "textMention",
          channel: "email",
          projectId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          inboxNotificationId: "605a50b01a36d5ea7a2e9104",
          mentionId: "605a50b01a36d5ea7a2e9104",
          userId: "userId",
          createdAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "notification",
        {
          kind: "$custom",
          channel: "email",
          projectId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          inboxNotificationId: "605a50b01a36d5ea7a2e9104",
          subjectId: "605a50ba1a36d5ea7a2e9104",
          userId: "userId",
          createdAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "threadMarkedAsResolved",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          updatedBy: "authorId",
          updatedAt: "2023-01-27T20:33:23.737Z",
        },
      ],
      [
        "threadMarkedAsUnresolved",
        {
          projectId: "605a50b01a36d5ea7a2e9104",
          threadId: "605a50b01a36d5ea7a2e9104",
          roomId: "examples-hero-21-07-2022",
          updatedBy: "authorId",
          updatedAt: "2023-01-27T20:33:23.737Z",
        },
      ],
    ])('should verify a "%s" event', (type, data) => {
      const now = 1674851609000;
      vi.useFakeTimers({
        now,
      });

      const timestamp = (now / 1000).toString();

      const body = {
        data,
        type,
      };

      const rawBody = JSON.stringify(body);

      const headers = {
        "webhook-id": "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
        "webhook-timestamp": timestamp,
        "webhook-signature": generateSignatureWithSvix(
          secret,
          "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
          timestamp,
          rawBody
        ),
      };

      const webhookHandler = new WebhookHandler(secret);
      const event = webhookHandler.verifyRequest({
        headers,
        rawBody,
      });

      expect(event).toEqual(body);
    });

    test('should verify a "ydocUpdated" event', () => {
      const ydocUpdated = {
        data: {
          appId: "605a50b01a36d5ea7a2e9104",
          roomId: "hero-grid-12-01-2022",
          updatedAt: "2023-01-27T20:27:48.744Z",
        },
        type: "ydocUpdated",
      };
      const rawYdocUpdated = JSON.stringify(ydocUpdated);

      const headersYdocUpdated = {
        "webhook-id": "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
        "webhook-timestamp": "1674851522",
        "webhook-signature": generateSignatureWithSvix(
          secret,
          "msg_2KvOK6yK9FO0U0nIyJYkM3jPwBs",
          "1674851522",
          rawYdocUpdated
        ),
      };

      vi.useFakeTimers({
        now: 1674851522000,
      });

      const webhookHandler = new WebhookHandler(secret);

      const event = webhookHandler.verifyRequest({
        headers: headersYdocUpdated,
        rawBody: rawYdocUpdated,
      });

      expect(event).toEqual(ydocUpdated);
    });

    test("should verify an event with multiple signatures", () => {
      vi.useFakeTimers({
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

    test("should allow a native Headers object", () => {
      vi.useFakeTimers({
        now: 1674850126000,
      });
      const webhookHandler = new WebhookHandler(secret);

      const headers = new Headers({
        ...userEnteredHeaders,
        "webhook-signature": generateSignatureWithSvix(
          secret,
          userEnteredHeaders["webhook-id"],
          userEnteredHeaders["webhook-timestamp"],
          rawUserEnteredBody
        ),
      });

      const event = webhookHandler.verifyRequest({
        headers,
        rawBody: rawUserEnteredBody,
      });

      expect(event).toEqual(userEnteredBody);
    });

    test("should throw if the rawBody is not a string", () => {
      vi.useFakeTimers({
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
          },
          // @ts-expect-error: we want to test invalid rawBody
          rawBody: {},
        })
      ).toThrowError(
        'Invalid rawBody field, must be a string, got "object" instead. It is likely that you need to JSON.stringify the body before passing it.'
      );
    });

    test("should throw if the signature is invalid", () => {
      vi.useFakeTimers({
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

    test("should throw if the timestamp is invalid", () => {
      vi.useFakeTimers({
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

    test("should throw if timestamp is above future threshold", () => {
      const tenMinutesAgo = 1674850126000 - 10 * 60 * 1000;
      vi.useFakeTimers({
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

    test("should throw if timestamp is below past threshold", () => {
      const tenMinutesFromNow = 1674850126000 + 10 * 60 * 1000;
      vi.useFakeTimers({
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

    test("should throw if the event type is not supported", () => {
      vi.useFakeTimers({
        now: 1674851522000,
      });

      const body = {
        data: {
          projectId: "605a50b01a36d5ea7a2e9104",
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

describe("Type guards", () => {
  describe("isThreadNotificationEvent", () => {
    test.each<{ name: string; event: WebhookEvent; expected: boolean }>([
      {
        name: "notification/thread",
        event: {
          type: "notification",
          data: {
            kind: "thread",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            threadId: "605a50b01a36d5ea7a2e9104",
            userId: "userId",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: true,
      },
      {
        name: "notification/textMention",
        event: {
          type: "notification",
          data: {
            kind: "textMention",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            mentionId: "605a50b01a36d5ea7a2e9104",
            userId: "userId",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: false,
      },
      {
        name: "commentCreated",
        event: {
          type: "commentCreated",
          data: {
            projectId: "605a50b01a36d5ea7a2e9104",
            threadId: "605a50b01a36d5ea7a2e9104",
            commentId: "605a50b01a36d5ea7a2e9104",
            createdAt: "2023-01-27T20:33:23.737Z",
            createdBy: "authorId",
            roomId: "examples-hero-21-07-2022",
          },
        },
        expected: false,
      },
    ])(
      'should check if the "$name" event is a thread notification event - ($expected)',
      ({ event, expected }) => {
        expect(isThreadNotificationEvent(event)).toBe(expected);
      }
    );
  });

  describe("isTextMentionNotificationEvent", () => {
    test.each<{ name: string; event: WebhookEvent; expected: boolean }>([
      {
        name: "notification/textMention",
        event: {
          type: "notification",
          data: {
            kind: "textMention",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            mentionId: "605a50b01a36d5ea7a2e9104",
            userId: "userId",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: true,
      },
      {
        name: "notification/thread",
        event: {
          type: "notification",
          data: {
            kind: "thread",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            threadId: "605a50b01a36d5ea7a2e9104",
            userId: "userId",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: false,
      },
      {
        name: "commentCreated",
        event: {
          type: "commentCreated",
          data: {
            projectId: "605a50b01a36d5ea7a2e9104",
            threadId: "605a50b01a36d5ea7a2e9104",
            commentId: "605a50b01a36d5ea7a2e9104",
            createdAt: "2023-01-27T20:33:23.737Z",
            createdBy: "authorId",
            roomId: "examples-hero-21-07-2022",
          },
        },
        expected: false,
      },
    ])(
      'should check if the "$name" event is a text mention notification event - ($expected)',
      ({ event, expected }) => {
        expect(isTextMentionNotificationEvent(event)).toBe(expected);
      }
    );
  });

  describe("isCustomNotificationEvent", () => {
    test.each<{ name: string; event: WebhookEvent; expected: boolean }>([
      {
        name: "notification/textMention",
        event: {
          type: "notification",
          data: {
            kind: "textMention",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            mentionId: "605a50b01a36d5ea7a2e9104",
            userId: "userId",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: false,
      },
      {
        name: "notification/thread",
        event: {
          type: "notification",
          data: {
            kind: "thread",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            threadId: "605a50b01a36d5ea7a2e9104",
            userId: "userId",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: false,
      },
      {
        name: "notification/$customKind",
        event: {
          type: "notification",
          data: {
            kind: "$fileUploaded",
            channel: "email",
            projectId: "605a50b01a36d5ea7a2e9104",
            roomId: "examples-hero-21-07-2022",
            userId: "user-0",
            subjectId: "subject-0",
            inboxNotificationId: "605a50b01a36d5ea7a2e9104",
            createdAt: "2023-01-27T20:33:23.737Z",
            triggeredAt: "2023-01-27T20:28:23.737Z",
          },
        },
        expected: true,
      },
    ])(
      'should check if the "$name" event is a custom kind notification event - ($expected)',
      ({ event, expected }) => {
        expect(isCustomNotificationEvent(event)).toBe(expected);
      }
    );
  });
});
