import type {
  CommentData,
  CommentUserReaction,
  ThreadData,
} from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { Liveblocks, LiveblocksError } from "../client";
import { DEFAULT_BASE_URL } from "../utils";

describe("client", () => {
  const room = {
    type: "room",
    id: "react-todo-list",
    lastConnectionAt: new Date("2022-08-04T21:07:09.380Z"),
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    metadata: {
      color: "blue",
      size: "10",
      target: ["abc", "def"],
    },
    defaultAccesses: ["room:write"],
    groupsAccesses: {
      marketing: ["room:write"],
    },
    usersAccesses: {
      alice: ["room:write"],
      vinod: ["room:write"],
    },
  };

  const activeUsers = [
    {
      type: "user",
      id: "alice",
      connectionId: 123,
      info: {
        name: "Alice",
      },
    },
  ];

  const comment: CommentData = {
    type: "comment",
    id: "comment1",
    roomId: "room1",
    threadId: "thread1",
    userId: "user1",
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    reactions: [
      {
        emoji: "🐐",
        createdAt: new Date("2022-07-13T14:32:50.697Z"),
        users: [{ id: "user1" }],
      },
    ],
    body: {
      version: 1,
      content: [],
    },
  };

  const thread: ThreadData<{
    color: string;
  }> = {
    type: "thread",
    id: "thread1",
    roomId: "room1",
    metadata: {
      color: "blue",
    },
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    comments: [comment],
  };

  const reaction: CommentUserReaction = {
    emoji: "🐐",
    createdAt: new Date("2022-07-13T14:32:50.697Z"),
    userId: "user1",
  };

  const server = setupServer(
    http.get(`${DEFAULT_BASE_URL}/v2/rooms`, () => {
      return HttpResponse.json(
        {
          nextPage: "/v2/rooms?startingAfter=1",
          data: [room],
        },
        { status: 200 }
      );
    }),
    http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId`, () => {
      return HttpResponse.json(room, { status: 200 });
    }),
    http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/active_users`, () => {
      return HttpResponse.json({
        data: activeUsers,
      });
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  test("should return a list of room when getRooms receives a successful response", async () => {
    const client = new Liveblocks({ secret: "sk_xxx" });
    await expect(client.getRooms()).resolves.toEqual({
      nextPage: "/v2/rooms?startingAfter=1",
      data: [room],
    });
  });

  test("should return a list of room when getRooms with additional params receives a successful response", async () => {
    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/rooms`, ({ request }) => {
        const url = new URL(request.url);

        expect(url.searchParams.size).toEqual(5);
        expect(url.searchParams.get("limit")).toEqual("10");
        expect(url.searchParams.get("startingAfter")).toEqual("2");
        expect(url.searchParams.get("metadata.color")).toEqual("blue");
        expect(url.searchParams.get("userId")).toEqual("user1");
        expect(url.searchParams.get("groupIds")).toEqual("group1");

        return HttpResponse.json(
          {
            nextPage: "/v2/rooms?startingAfter=1",
            data: [room],
          },
          { status: 200 }
        );
      })
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.getRooms({
        limit: 10,
        startingAfter: "2",
        metadata: {
          color: "blue",
        },
        userId: "user1",
        groupIds: ["group1"],
      })
    ).resolves.toEqual({
      nextPage: "/v2/rooms?startingAfter=1",
      data: [room],
    });
  });

  test("should return a list of room when getRooms with partial params receives a successful response", async () => {
    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/rooms`, ({ request }) => {
        const url = new URL(request.url);

        expect(url.searchParams.size).toEqual(2);
        expect(url.searchParams.get("limit")).toEqual("10");
        expect(url.searchParams.get("startingAfter")).toEqual(null);
        expect(url.searchParams.get("metadata.color")).toEqual("blue");
        expect(url.searchParams.get("userId")).toEqual(null);
        expect(url.searchParams.get("groupIds")).toEqual(null);

        return HttpResponse.json(
          {
            nextPage: "/v2/rooms?startingAfter=1",
            data: [room],
          },
          { status: 200 }
        );
      })
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.getRooms({
        limit: 10,
        metadata: {
          color: "blue",
        },
      })
    ).resolves.toEqual({
      nextPage: "/v2/rooms?startingAfter=1",
      data: [room],
    });
  });

  test("should return room data when getRoom receives a successful response", async () => {
    const client = new Liveblocks({ secret: "sk_xxx" });
    await expect(client.getRoom("123")).resolves.toEqual(room);
  });

  test("should return active users when getActiveUsers receives a successful response", async () => {
    const client = new Liveblocks({ secret: "sk_xxx" });
    await expect(client.getActiveUsers("123")).resolves.toEqual({
      data: activeUsers,
    });
  });

  test("should return the edited comment when editComment receives a successful response", async () => {
    const commentData = {
      body: {
        version: 1 as const,
        content: [],
      },
      editedAt: new Date(),
    };

    server.use(
      http.post(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId`,
        async ({ request }) => {
          const data = await request.json();

          if (JSON.stringify(data) === JSON.stringify(commentData)) {
            return HttpResponse.json(comment);
          }

          return HttpResponse.error();
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });
    const res = await client.editComment({
      roomId: "room1",
      threadId: "thread1",
      commentId: "comment1",
      data: commentData,
    });
    expect(res).toEqual(comment);
  });

  test("should throw a LiveblocksError when editComment receives an error response", async () => {
    const error = {
      error: "RESOURCE_NOT_FOUND",
      message: "Comment not found",
    };

    server.use(
      http.post(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId`,
        () => {
          return HttpResponse.json(error, { status: 404 });
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    // This should throw a LiveblocksError
    try {
      // Attempt to get, which should fail and throw an error.
      await client.editComment({
        roomId: "room1",
        threadId: "thread1",
        commentId: "comment1",
        data: {
          body: {
            version: 1 as const,
            content: [],
          },
        },
      });
      // If it doesn't throw, fail the test.
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof LiveblocksError).toBe(true);
      if (err instanceof LiveblocksError) {
        expect(err.status).toBe(404);
        expect(err.message).toBe(JSON.stringify(error));
        expect(err.name).toBe("LiveblocksError");
      }
    }
  });

  test("should return the created thread when createThread receives a successful response", async () => {
    const threadData = {
      comment: {
        userId: "user1",
        createdAt: new Date(),
        body: {
          version: 1 as const,
          content: [],
        },
      },
      metadata: {
        color: "blue",
      },
    };

    server.use(
      http.post(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`,
        async ({ request }) => {
          const data = await request.json();

          if (JSON.stringify(threadData) === JSON.stringify(data)) {
            return HttpResponse.json(thread);
          }

          return HttpResponse.error();
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });
    const res = await client.createThread({
      roomId: "room1",
      data: threadData,
    });

    expect(res).toEqual(thread);
  });

  test("should throw a LiveblocksError when createThread receives an error response", async () => {
    const threadData = {
      comment: {
        userId: "user1",
        createdAt: new Date(),
        body: {
          version: 1 as const,
          content: [],
        },
      },
      metadata: {
        color: "blue",
      },
    };

    const error = {
      error: "RESOURCE_ALREADY_EXISTES",
      message: "Thread already exists",
    };

    server.use(
      http.post(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`,
        async ({ request }) => {
          const data = await request.json();
          if (JSON.stringify(threadData) === JSON.stringify(data)) {
            return HttpResponse.json(error, { status: 409 });
          }

          return HttpResponse.error();
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    // This should throw a LiveblocksError
    try {
      // Attempt to create a thread, which should fail and throw an error.
      await client.createThread({
        roomId: "room1",
        data: threadData,
      });
      // If it doesn't throw, fail the test.
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof LiveblocksError).toBe(true);
      if (err instanceof LiveblocksError) {
        expect(err.status).toBe(409);
        expect(err.message).toBe(JSON.stringify(error));
        expect(err.name).toBe("LiveblocksError");
      }
    }
  });

  test("should throw a LiveblocksError when getRoom receives an error response", async () => {
    const error = {
      error: "ROOM_NOT_FOUND",
      message: "Room not found",
      suggestion:
        "Please use a valid room ID, room IDs are available in the dashboard: https://liveblocks.io/dashboard/rooms",
      docs: "https://liveblocks.io/docs/api-reference/rest-api-endpoints",
    };

    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId`, () => {
        return HttpResponse.json(error, { status: 404 });
      })
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    // This should throw an LiveblocksError
    try {
      // Attempt to get, which should fail and throw an error.
      await client.getRoom("123");
      // If it doesn't throw, fail the test.
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof LiveblocksError).toBe(true);
      if (err instanceof LiveblocksError) {
        expect(err.status).toBe(404);
        expect(err.message).toBe(JSON.stringify(error));
        expect(err.name).toBe("LiveblocksError");
      }
    }
  });

  test("should return a list of threads when getThreads receives a successful response", async () => {
    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads`, () => {
        return HttpResponse.json(
          {
            data: [thread],
          },
          { status: 200 }
        );
      })
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.getThreads({
        roomId: "room1",
      })
    ).resolves.toEqual({
      data: [thread],
    });
  });

  test("should return the specified thread when getThread receives a successful response", async () => {
    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId`, () => {
        return HttpResponse.json(thread, { status: 200 });
      })
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.getThread({
        roomId: "room1",
        threadId: "thread1",
      })
    ).resolves.toEqual(thread);
  });

  test("should return the specified comment when getComment receives a successful response", async () => {
    server.use(
      http.get(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId`,
        () => {
          return HttpResponse.json(comment, { status: 200 });
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.getComment({
        roomId: "room1",
        threadId: "thread1",
        commentId: "comment1",
      })
    ).resolves.toEqual(comment);
  });

  test("should add a reaction to a comment when addReaction receives a successful response", async () => {
    server.use(
      http.post(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/threads/:threadId/comments/:commentId/add-reaction`,
        () => {
          return HttpResponse.json(reaction, { status: 200 });
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.addCommentReaction({
        roomId: "room1",
        threadId: "thread1",
        commentId: "comment1",
        data: reaction,
      })
    ).resolves.toEqual(reaction);
  });

  test("should throw an error when getRoom fails due to network error", async () => {
    // Simulate a network error response.
    server.use(
      http.get(`${DEFAULT_BASE_URL}/v2/rooms/:roomId`, () => {
        return HttpResponse.error();
      })
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    // Expect the function to throw an error due to the network issue. However, it should not be an HttpError.
    try {
      // Attempt to get, which should fail and throw an error.
      await client.getRoom("123");
      // If it doesn't throw, fail the test.
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof LiveblocksError).toBe(false);
    }
  });

  test("should successfully send a Yjs update", async () => {
    const update = new Uint8Array([21, 31]);
    server.use(
      http.put(
        `${DEFAULT_BASE_URL}/v2/rooms/:roomId/ydoc`,
        async ({ request }) => {
          const buffer = await request.arrayBuffer();
          const data = new Uint8Array(buffer);

          // Return void if the data is the same as the update.
          if (data.length === update.length) {
            for (let i = 0; i < data.length; i++) {
              if (data[i] !== update[i]) {
                return HttpResponse.error();
              }
            }
          }

          return HttpResponse.json(null);
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.sendYjsBinaryUpdate("roomId", update)
    ).resolves.not.toThrow();
  });

  test("should return the specified inbox notification when getUserInboxNotification receives a successful response", async () => {
    const userId = "user1";
    const inboxNotificationId = "notification1";

    const notification = {
      id: inboxNotificationId,
      kind: "thread",
      notifiedAt: new Date().toISOString(),
      readAt: null,
      threadId: "thread1",
    };

    server.use(
      http.get(
        `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
        () => {
          return HttpResponse.json(notification, { status: 200 });
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    await expect(
      client.getUserInboxNotification({
        userId,
        inboxNotificationId,
      })
    ).resolves.toEqual({
      ...notification,
      notifiedAt: new Date(notification.notifiedAt),
      readAt: notification.readAt ? new Date(notification.readAt) : null,
    });
  });

  test("should throw a LiveblocksError when getUserInboxNotification receives an error response", async () => {
    const userId = "user1";
    const inboxNotificationId = "notification1";

    const error = {
      error: "INBOX_NOTIFICATION_NOT_FOUND",
      message: "Inbox notification not found",
    };

    server.use(
      http.get(
        `${DEFAULT_BASE_URL}/v2/users/:userId/inbox-notifications/:notificationId`,
        () => {
          return HttpResponse.json(error, { status: 404 });
        }
      )
    );

    const client = new Liveblocks({ secret: "sk_xxx" });

    // This should throw a LiveblocksError
    try {
      // Attempt to get, which should fail and throw an error.
      await client.getUserInboxNotification({
        userId,
        inboxNotificationId,
      });
      // If it doesn't throw, fail the test.
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof LiveblocksError).toBe(true);
      if (err instanceof LiveblocksError) {
        expect(err.status).toBe(404);
        expect(err.message).toBe(JSON.stringify(error));
        expect(err.name).toBe("LiveblocksError");
      }
    }
  });
});
