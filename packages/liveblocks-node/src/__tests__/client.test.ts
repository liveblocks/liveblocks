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

  test("should throw an ApiError when getRoom receives an error response", async () => {
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

    // This should throw an HttpError
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
});
