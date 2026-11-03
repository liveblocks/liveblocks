import { createClient } from "@liveblocks/client";
import {
  isPlainObject,
  kInternal,
  Promise_withResolvers,
  type RoomAccess,
} from "@liveblocks/core";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { getLiveblocksExtrasForClient } from "../liveblocks";
import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import { createContextsForTest, generateFakeJwt } from "./_utils";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeAccessToken(roomId: string): string {
  return `${btoa(JSON.stringify({ alg: "HS256" }))}.${btoa(
    JSON.stringify({
      k: "acc",
      pid: "project",
      uid: "user",
      perms: { [roomId]: ["room:write"] },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  )}.${btoa("signature")}`;
}

test.each(["inbox-notifications", "threads"])(
  "a %s poll preserves rooms authorized by another cached token",
  async (resource) => {
    const threads = [
      dummyThreadData({ roomId: "room-a" }),
      dummyThreadData({ roomId: "room-b" }),
    ];
    const tokens = new Map(
      threads.map((thread) => [thread.roomId, makeAccessToken(thread.roomId)])
    );
    const checks: {
      token: string;
      roomIds: string[];
      accessOnly: boolean;
      since: string | null;
    }[] = [];
    let deleted = false;
    server.use(
      http.get(
        "https://api.liveblocks.io/v2/c/rooms/:roomId/threads",
        ({ params, request }) => {
          const roomId = String(params.roomId);
          expect(request.headers.get("Authorization")).toBe(
            `Bearer ${tokens.get(roomId)}`
          );
          if (deleted && roomId === "room-a")
            return HttpResponse.json({ message: "Not found" }, { status: 404 });
          return HttpResponse.json({
            data: threads.filter((thread) => thread.roomId === roomId),
            inboxNotifications: [],
            subscriptions: [],
            meta: {
              requestedAt: "2026-01-01T00:00:00.000Z",
              nextCursor: null,
              permissionHints: { [roomId]: ["room:write"] },
            },
          });
        }
      ),
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        })
      ),
      http.get("https://api.liveblocks.io/v2/c/threads", () =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: "2026-01-01T00:00:00.000Z",
            nextCursor: null,
            permissionHints: {},
          },
        })
      ),
      http.get(
        "https://api.liveblocks.io/v2/c/:resource/delta",
        ({ request }) => {
          const bearer = request.headers.get("Authorization") ?? "";
          const query = new URL(request.url).searchParams;
          const roomIds: string[] = JSON.parse(query.get("roomIds") ?? "[]");
          checks.push({
            token: bearer,
            roomIds,
            accessOnly: query.get("roomAccessesOnly") === "true",
            since: query.get("since"),
          });
          return HttpResponse.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt:
                bearer === `Bearer ${tokens.get("room-a")}`
                  ? "2026-01-01T00:01:00.000Z"
                  : "2026-01-01T00:02:00.000Z",
              permissionHints: {},
              roomAccesses: roomIds.map((roomId) => ({
                roomId,
                access:
                  bearer === `Bearer ${tokens.get(roomId)}` &&
                  !(deleted && roomId === "room-a")
                    ? "room"
                    : "none",
              })),
            },
          });
        }
      )
    );
    const client = createClient({
      authEndpoint: async (roomId) => ({
        token: tokens.get(roomId ?? "room-b") ?? "",
      }),
    });
    const { store } = getLiveblocksExtrasForClient(client);
    await store.outputs.loadingRoomThreads
      .getOrCreate('["room-a",{}]')
      .waitUntilLoaded();
    await store.outputs.loadingRoomThreads
      .getOrCreate('["room-b",{}]')
      .waitUntilLoaded();
    const list =
      resource === "inbox-notifications"
        ? store.outputs.loadingNotifications
        : store.outputs.loadingUserThreads;
    await list.getOrCreate("{}").waitUntilLoaded();
    expect(store.threads.get(threads[0]!.id)).toBeDefined();
    const poll =
      resource === "inbox-notifications"
        ? store.fetchNotificationsDeltaUpdate
        : store.fetchUserThreadsDeltaUpdate;
    await poll(new AbortController().signal);
    expect(checks.filter((check) => !check.accessOnly)).toEqual([
      {
        token: `Bearer ${tokens.get("room-b")}`,
        roomIds: [],
        accessOnly: false,
        since: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(checks.filter((check) => check.accessOnly)).toEqual([
      {
        token: `Bearer ${tokens.get("room-a")}`,
        roomIds: ["room-a"],
        accessOnly: true,
        since: expect.any(String),
      },
      {
        token: `Bearer ${tokens.get("room-b")}`,
        roomIds: ["room-b"],
        accessOnly: true,
        since: expect.any(String),
      },
    ]);
    expect(store.threads.get(threads[0]!.id)).toEqual(threads[0]);
    expect(store.threads.get(threads[1]!.id)).toEqual(threads[1]);
    deleted = true;
    await poll(new AbortController().signal);
    expect(store.threads.get(threads[0]!.id)).toBeUndefined();
    expect(store.threads.get(threads[1]!.id)).toEqual(threads[1]);
    expect(
      checks.filter((check) => !check.accessOnly).map((check) => check.since)
    ).toEqual(["2026-01-01T00:00:00.000Z", "2026-01-01T00:02:00.000Z"]);
  }
);

test("access checks bound URLs containing long encoded room IDs", async () => {
  const roomIds = Array.from(
    { length: 8 },
    (_, index) => `room-${index}-${"✓".repeat(100)}`
  );
  const batches: string[][] = [];
  server.use(
    http.get(
      "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
      ({ request }) => {
        const query = new URL(request.url).searchParams;
        const rooms: string[] = JSON.parse(query.get("roomIds") ?? "[]");
        expect(query.get("roomAccessesOnly")).toBe("true");
        expect(
          encodeURIComponent(JSON.stringify(rooms)).length
        ).toBeLessThanOrEqual(4000);
        batches.push(rooms);
        return HttpResponse.json({
          meta: {
            roomAccesses: rooms.map((roomId) => ({ roomId, access: "room" })),
          },
        });
      }
    )
  );
  const { client } = createContextsForTest();
  const accesses: RoomAccess[] = [];
  await client[kInternal].httpClient.checkRoomAccesses({
    roomIds,
    onAccesses: (batch) => accesses.push(...batch),
  });
  expect(batches).toHaveLength(2);
  expect(batches.flat()).toEqual(roomIds);
  expect(accesses).toEqual(
    roomIds.map((roomId) => ({ roomId, access: "room" }))
  );
});

test.each(["denied", "unavailable"])(
  "a room authorization that is %s preserves the personal inbox",
  async (failure) => {
    const thread = dummyThreadData({ roomId: "room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    const error = new Error("authentication unavailable");
    const client = createClient({
      authEndpoint: async (roomId) => {
        if (roomId === thread.roomId) {
          if (failure === "denied")
            return { error: "forbidden", reason: "Room is inaccessible" };
          throw error;
        }
        return { token: makeAccessToken("other-room") };
      },
    });
    server.use(
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
        HttpResponse.json({
          threads: [thread],
          inboxNotifications: [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        })
      ),
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications/delta", () =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: "2026-01-01T00:01:00.000Z",
            roomAccesses: [{ roomId: thread.roomId, access: "room" }],
          },
        })
      )
    );
    const { store } = getLiveblocksExtrasForClient(client);
    await store.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
    expect(store.threads.get(thread.id)).toEqual(thread);
    expect(store.notifications.signal.get().get(notification.id)).toEqual(
      notification
    );
  }
);

test.each([403, 404, 503])(
  "a room authentication HTTP %s is handled without a false revocation",
  async (status) => {
    const thread = dummyThreadData({ roomId: "room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    let authenticationUnavailable = true;
    const sinceValues: (string | null)[] = [];
    const client = createClient({ authEndpoint: "https://example.com/auth" });
    server.use(
      http.post("https://example.com/auth", async ({ request }) => {
        const body: unknown = await request.json();
        if (
          authenticationUnavailable &&
          isPlainObject(body) &&
          body.room === thread.roomId
        )
          return new HttpResponse("room authentication failed", { status });
        return HttpResponse.json({
          token: makeAccessToken(
            isPlainObject(body) && typeof body.room === "string"
              ? body.room
              : "other-room"
          ),
        });
      }),
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
        HttpResponse.json({
          threads: [thread],
          inboxNotifications: [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        })
      ),
      http.get(
        "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
        ({ request }) => {
          const query = new URL(request.url).searchParams;
          if (query.get("roomAccessesOnly") !== "true")
            sinceValues.push(query.get("since"));
          return HttpResponse.json({
            threads:
              query.get("roomAccessesOnly") === "true"
                ? []
                : [{ ...thread, metadata: { updated: true } }],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: "2026-01-01T00:01:00.000Z",
              roomAccesses: [{ roomId: thread.roomId, access: "room" }],
            },
          });
        }
      )
    );
    const { store } = getLiveblocksExtrasForClient(client);
    await store.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
    expect(store.threads.get(thread.id)).toEqual({
      ...thread,
      metadata: { updated: true },
    });
    expect(store.notifications.signal.get().get(notification.id)).toEqual(
      notification
    );
    authenticationUnavailable = false;
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
    expect(sinceValues).toEqual([
      "2026-01-01T00:00:00.000Z",
      status === 403 ? "2026-01-01T00:01:00.000Z" : "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:01:00.000Z",
    ]);
  }
);

test.each(["error", "timeout"])(
  "room authentication %s leaves other room checks running",
  async (failure) => {
    const started = Promise_withResolvers<void>();
    const release = Promise_withResolvers<void>();
    const client = createClient({
      authEndpoint: async (roomId) => {
        if (roomId === "unavailable-room") {
          if (failure === "error") throw new Error("Unavailable");
          started.resolve();
          await release.promise;
        }
        return {
          token: makeAccessToken(roomId === undefined ? "personal" : "*"),
        };
      },
    });
    const accesses: RoomAccess[] = [
      { roomId: "readable-room", access: "room" },
      { roomId: "revoked-room", access: "none" },
    ];
    server.use(
      http.get(
        "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
        ({ request }) => {
          expect(new URL(request.url).searchParams.get("roomIds")).toBe(
            JSON.stringify(accesses.map(({ roomId }) => roomId))
          );
          return delta([], accesses);
        }
      )
    );
    const onAccesses = vi.fn();
    if (failure === "timeout") vi.useFakeTimers();
    const timeout =
      failure === "timeout"
        ? vi
            .spyOn(AbortSignal, "timeout")
            .mockImplementation((milliseconds) => {
              const controller = new AbortController();
              setTimeout(() => controller.abort(), milliseconds);
              return controller.signal;
            })
        : undefined;
    try {
      const checks$ = client[kInternal].httpClient.checkRoomAccesses({
        roomIds: ["unavailable-room", ...accesses.map(({ roomId }) => roomId)],
        onAccesses,
      });
      if (failure === "timeout") {
        await started.promise;
        await vi.advanceTimersByTimeAsync(5_001);
      }
      expect(await checks$).toBe(false);
      expect(onAccesses).toHaveBeenCalledExactlyOnceWith(accesses);
    } finally {
      release.resolve();
      timeout?.mockRestore();
      if (failure === "timeout") vi.useRealTimers();
    }
  }
);

test("a confirmed denial skips room page refreshes after authentication is revoked", async () => {
  const thread = dummyThreadData({ roomId: "room" });
  let revoked = false;
  const roomAuth = vi.fn(async () =>
    revoked
      ? { error: "forbidden", reason: "Revoked" }
      : { token: makeAccessToken(thread.roomId) }
  );
  const client = createClient({
    authEndpoint: async (roomId) =>
      roomId === thread.roomId
        ? roomAuth()
        : { token: makeAccessToken("personal") },
  });
  const sinceValues: (string | null)[] = [];
  server.use(
    http.get("https://api.liveblocks.io/v2/c/rooms/room/threads", () =>
      HttpResponse.json({
        data: [thread],
        inboxNotifications: [],
        subscriptions: [],
        meta: {
          requestedAt: "2026-01-01T00:00:00.000Z",
          nextCursor: null,
          permissionHints: { room: ["room:write"] },
        },
      })
    ),
    http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
      HttpResponse.json({
        threads: [],
        inboxNotifications: [],
        subscriptions: [],
        groups: [],
        meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
      })
    ),
    http.get(
      "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
      ({ request }) => {
        const query = new URL(request.url).searchParams;
        if (query.get("roomAccessesOnly") !== "true")
          sinceValues.push(query.get("since"));
        return delta([], [{ roomId: thread.roomId, access: "none" }]);
      }
    )
  );
  const { store } = getLiveblocksExtrasForClient(client);
  await store.outputs.loadingRoomThreads
    .getOrCreate('["room",{}]')
    .waitUntilLoaded();
  await store.outputs.loadingNotifications.getOrCreate("{}").waitUntilLoaded();
  revoked = true;
  client.logout();
  for (let pollIndex = 0; pollIndex < 3; pollIndex++)
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
  expect(store.threads.get(thread.id)).toBeUndefined();
  expect(roomAuth).toHaveBeenCalledTimes(4);
  expect(sinceValues).toEqual([
    "2026-01-01T00:00:00.000Z",
    "2026-01-01T00:00:00.000Z",
    "2026-01-01T00:02:00.000Z",
  ]);
});

test("an initial room page deadline also bounds its access confirmation", async () => {
  const thread = dummyThreadData({ roomId: "room" });
  const started = Promise_withResolvers<void>();
  const release = Promise_withResolvers<void>();
  let restored = false;
  let confirmationSignal: AbortSignal | undefined;
  let confirmations = 0;
  server.use(
    http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
      HttpResponse.json({
        threads: restored ? [] : [thread],
        inboxNotifications: [],
        subscriptions: [],
        groups: [],
        meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
      })
    ),
    http.get("https://api.liveblocks.io/v2/c/rooms/room/threads", () =>
      HttpResponse.json({
        data: [thread],
        inboxNotifications: [],
        subscriptions: [],
        meta: {
          requestedAt: "2026-01-01T00:00:00.000Z",
          nextCursor: null,
          permissionHints: { room: ["room:write"] },
        },
      })
    ),
    http.get(
      "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
      async ({ request }) => {
        if (
          new URL(request.url).searchParams.get("roomAccessesOnly") ===
            "true" &&
          restored &&
          ++confirmations === 1
        ) {
          confirmationSignal = request.signal;
          started.resolve();
          await release.promise;
        }
        return HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: "2026-01-01T00:01:00.000Z",
            roomAccesses: [
              { roomId: thread.roomId, access: restored ? "room" : "none" },
            ],
          },
        });
      }
    )
  );
  const { umbrellaStore } = createContextsForTest();
  await umbrellaStore.outputs.loadingNotifications
    .getOrCreate("{}")
    .waitUntilLoaded();
  await umbrellaStore.fetchNotificationsDeltaUpdate(
    new AbortController().signal
  );
  restored = true;
  const controller = new AbortController();
  const timeout = vi
    .spyOn(AbortSignal, "timeout")
    .mockReturnValueOnce(controller.signal)
    .mockImplementation(() => new AbortController().signal);
  const load$ = umbrellaStore.outputs.loadingRoomThreads
    .getOrCreate('["room",{}]')
    .waitUntilLoaded();
  const outcome$ = load$.then(
    () => undefined,
    (error: unknown) => error
  );
  await started.promise;
  vi.useFakeTimers();
  controller.abort();
  try {
    expect(timeout).toHaveBeenCalledWith(30_000);
    expect(confirmationSignal?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(5_001);
    expect(await outcome$).toBeUndefined();
    expect(confirmations).toBe(2);
    expect(umbrellaStore.threads.get(thread.id)).toEqual(thread);
  } finally {
    release.resolve();
    await vi.advanceTimersByTimeAsync(40_000);
    await outcome$;
    timeout.mockRestore();
    vi.useRealTimers();
  }
});

test.each(["inbox", "user threads", "room threads"])(
  "a %s page deadline interrupts authentication and permits a fresh attempt",
  async (source) => {
    const started = Promise_withResolvers<void>();
    const release = Promise_withResolvers<void>();
    let attempts = 0;
    const client = createClient({
      authEndpoint: async () => {
        if (++attempts === 1) {
          started.resolve();
          await release.promise;
        }
        return { token: await generateFakeJwt({ userId: "user" }) };
      },
    });
    const endpoint =
      source === "inbox"
        ? "inbox-notifications"
        : source === "user threads"
          ? "threads"
          : "rooms/room/threads";
    server.use(
      http.get(`https://api.liveblocks.io/v2/c/${endpoint}`, () =>
        HttpResponse.json({
          data: [],
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: "2026-01-01T00:00:00.000Z",
            nextCursor: null,
            permissionHints: {},
          },
        })
      )
    );
    const api = client[kInternal].httpClient;
    const fetchPage = () =>
      source === "inbox"
        ? api.getInboxNotifications()
        : source === "user threads"
          ? api.getUserThreads_experimental()
          : api.getThreads({ roomId: "room" });
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValueOnce(controller.signal)
      .mockImplementation(() => new AbortController().signal);
    const first$ = fetchPage();
    const outcome$ = first$.then(
      () => undefined,
      (error: unknown) => error
    );
    await started.promise;
    controller.abort();
    try {
      expect(await outcome$).toBe(controller.signal.reason);
      await fetchPage();
      expect(attempts).toBe(2);
    } finally {
      release.resolve();
      await outcome$;
      timeout.mockRestore();
    }
  }
);

function delta(
  threads: ReturnType<typeof dummyThreadData>[],
  roomAccesses: RoomAccess[]
) {
  return HttpResponse.json({
    threads,
    inboxNotifications: [],
    subscriptions: [],
    deletedThreads: [],
    deletedInboxNotifications: [],
    deletedSubscriptions: [],
    meta: {
      requestedAt: "2026-01-01T00:02:00.000Z",
      roomAccesses,
      permissionHints: {},
    },
  });
}

test.each(["inbox-notifications", "threads"])(
  "a %s poll does not skip updates when access changes during the poll",
  async (resource) => {
    const thread = dummyThreadData({
      roomId: "room",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      metadata: { version: 0 },
    });
    const updated = {
      ...thread,
      updatedAt: new Date("2026-01-01T00:01:00.000Z"),
      metadata: { version: 1 },
    };
    let initialPage = true;
    let readable = false;
    server.use(
      http.get("https://api.liveblocks.io/v2/c/:resource", () => {
        const result = initialPage ? thread : updated;
        initialPage = false;
        return HttpResponse.json({
          threads: [result],
          inboxNotifications: [],
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: "2026-01-01T00:00:00.000Z",
            nextCursor: null,
            permissionHints: {},
          },
        });
      }),
      http.get(
        "https://api.liveblocks.io/v2/c/:resource/delta",
        ({ request }) => {
          const query = new URL(request.url).searchParams;
          const rooms: string[] = JSON.parse(query.get("roomIds") ?? "[]");
          if (query.get("roomAccessesOnly") === "true") {
            return delta(
              [],
              rooms.map((roomId) => ({
                roomId,
                access: readable ? "room" : "none",
              }))
            );
          }
          const snapshot = readable;
          const since = query.get("since");
          const updates =
            snapshot && since !== null && new Date(since) <= updated.updatedAt
              ? [updated]
              : [];
          // The grant commits after this data query has already filtered out the room.
          readable = true;
          return delta(
            updates,
            rooms.map((roomId) => ({
              roomId,
              access: snapshot ? "room" : "none",
            }))
          );
        }
      )
    );
    const { umbrellaStore } = createContextsForTest();
    const list =
      resource === "inbox-notifications"
        ? umbrellaStore.outputs.loadingNotifications
        : umbrellaStore.outputs.loadingUserThreads;
    await list.getOrCreate("{}").waitUntilLoaded();
    const poll =
      resource === "inbox-notifications"
        ? umbrellaStore.fetchNotificationsDeltaUpdate
        : umbrellaStore.fetchUserThreadsDeltaUpdate;
    for (let pollIndex = 0; pollIndex < 3; pollIndex++)
      await poll(new AbortController().signal);
    expect(umbrellaStore.threads.get(thread.id)?.metadata).toEqual({
      version: 1,
    });
  }
);

test.each(["inbox-notifications", "threads"])(
  "a failed later %s room batch does not discard an earlier confirmed denial",
  async (resource) => {
    const threads = Array.from({ length: 51 }, (_, index) =>
      dummyThreadData({ roomId: `room-${index}` })
    );
    let unavailable = true;
    const dataCursors: (string | null)[] = [];
    server.use(
      http.get("https://api.liveblocks.io/v2/c/:resource", () =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: "2026-01-01T00:00:00.000Z",
            nextCursor: null,
            permissionHints: {},
          },
        })
      ),
      http.get(
        "https://api.liveblocks.io/v2/c/:resource/delta",
        ({ request }) => {
          const query = new URL(request.url).searchParams;
          const rooms: string[] = JSON.parse(query.get("roomIds") ?? "[]");
          if (query.get("roomAccessesOnly") !== "true")
            dataCursors.push(query.get("since"));
          if (unavailable && rooms.includes("room-50"))
            return HttpResponse.json(
              { message: "Unavailable" },
              { status: 503 }
            );
          return delta(
            [],
            rooms.map((roomId) => ({
              roomId,
              access: roomId !== "room-0" ? "room" : "none",
            }))
          );
        }
      )
    );
    const { umbrellaStore } = createContextsForTest();
    const list =
      resource === "inbox-notifications"
        ? umbrellaStore.outputs.loadingNotifications
        : umbrellaStore.outputs.loadingUserThreads;
    await list.getOrCreate("{}").waitUntilLoaded();
    const poll =
      resource === "inbox-notifications"
        ? umbrellaStore.fetchNotificationsDeltaUpdate
        : umbrellaStore.fetchUserThreadsDeltaUpdate;
    umbrellaStore.updateThreadifications(threads, [], []);
    await poll(new AbortController().signal);
    expect(umbrellaStore.threads.get(threads[0]!.id)).toBeUndefined();
    expect(dataCursors).toEqual(["2026-01-01T00:00:00.000Z"]);
    unavailable = false;
    await poll(new AbortController().signal);
    await poll(new AbortController().signal);
    expect(dataCursors).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:02:00.000Z",
    ]);
  }
);

test("a failed token check preserves another token's confirmed denial", async () => {
  const accesses: RoomAccess[] = [];
  const client = createClient({
    authEndpoint: async (roomId) => ({
      token: makeAccessToken(roomId ?? "personal"),
    }),
  });
  server.use(
    http.get(
      "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
      ({ request }) => {
        const rooms: string[] = JSON.parse(
          new URL(request.url).searchParams.get("roomIds") ?? "[]"
        );
        if (rooms.includes("room-a"))
          return delta([], [{ roomId: "room-a", access: "none" }]);
        return HttpResponse.json({ message: "Unavailable" }, { status: 503 });
      }
    )
  );
  await expect(
    client[kInternal].httpClient.checkRoomAccesses({
      roomIds: ["room-a", "room-b"],
      onAccesses: (batch) => {
        accesses.push(...batch);
      },
    })
  ).resolves.toBe(false);
  expect(accesses).toEqual([{ roomId: "room-a", access: "none" }]);
});

test.each([
  { resource: "inbox-notifications", stalledRequest: "authentication" },
  { resource: "threads", stalledRequest: "authentication" },
  { resource: "inbox-notifications", stalledRequest: "access check" },
  { resource: "threads", stalledRequest: "access check" },
])(
  "$resource updates survive stalled room $stalledRequest",
  async ({ resource, stalledRequest }) => {
    const stalled = dummyThreadData({ roomId: "stalled-room" });
    const healthy = dummyThreadData({ roomId: "healthy-room" });
    const started = Promise_withResolvers<void>();
    const release = Promise_withResolvers<void>();
    const client = createClient({
      authEndpoint: async (roomId) => {
        if (stalledRequest === "authentication" && roomId === stalled.roomId) {
          started.resolve();
          await release.promise;
        }
        return { token: makeAccessToken(roomId ?? healthy.roomId) };
      },
    });
    let version = 0;
    server.use(
      http.get("https://api.liveblocks.io/v2/c/:resource", () =>
        HttpResponse.json({
          threads: [stalled, healthy],
          inboxNotifications: [],
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: "2026-01-01T00:00:00.000Z",
            nextCursor: null,
            permissionHints: {},
          },
        })
      ),
      http.get(
        "https://api.liveblocks.io/v2/c/:resource/delta",
        async ({ request }) => {
          const query = new URL(request.url).searchParams;
          if (query.get("roomAccessesOnly") === "true") {
            if (
              stalledRequest === "access check" &&
              query.get("roomIds")?.includes(stalled.roomId)
            ) {
              started.resolve();
              await release.promise;
            }
            return delta([], []);
          }
          return delta([{ ...healthy, metadata: { version: ++version } }], []);
        }
      )
    );
    const { store } = getLiveblocksExtrasForClient(client);
    const list =
      resource === "inbox-notifications"
        ? store.outputs.loadingNotifications
        : store.outputs.loadingUserThreads;
    const poll =
      resource === "inbox-notifications"
        ? store.fetchNotificationsDeltaUpdate
        : store.fetchUserThreadsDeltaUpdate;
    await list.getOrCreate("{}").waitUntilLoaded();
    vi.useFakeTimers();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockImplementation((milliseconds) => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), milliseconds);
        return controller.signal;
      });
    try {
      for (let pollIndex = 1; pollIndex <= 2; pollIndex++) {
        const controller = new AbortController();
        const outcome$ = poll(controller.signal);
        try {
          await vi.advanceTimersByTimeAsync(1);
          await started.promise;
          await vi.advanceTimersByTimeAsync(5_000);
          await outcome$;
          expect(controller.signal.aborted).toBe(false);
          expect(store.threads.get(healthy.id)?.metadata).toEqual({
            version: pollIndex,
          });
        } finally {
          controller.abort();
          await outcome$.catch(() => undefined);
        }
      }
    } finally {
      release.resolve();
      timeout.mockRestore();
      vi.useRealTimers();
    }
  }
);

test.each(["delta", "delete", "delete all"])(
  "inbox-only access prunes other threads and handles notification %s",
  async (deletion) => {
    const notified = dummyThreadData({ roomId: "room" });
    const unrelated = dummyThreadData({ roomId: "room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: notified.roomId,
      threadId: notified.id,
    });
    let revoked = false;
    let notificationDeleted = false;
    const client = createClient({
      authEndpoint: async (roomId) => {
        if (revoked && roomId === notified.roomId)
          return { error: "forbidden", reason: "Room revoked" };
        return { token: makeAccessToken(roomId ?? "other-room") };
      },
    });
    server.use(
      http.get("https://api.liveblocks.io/v2/c/rooms/room/threads", () =>
        HttpResponse.json({
          data: [notified, unrelated],
          inboxNotifications: notificationDeleted ? [] : [notification],
          subscriptions: [],
          meta: {
            requestedAt: "2026-01-01T00:00:00.000Z",
            nextCursor: null,
            permissionHints: { room: ["room:write"] },
          },
        })
      ),
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
        HttpResponse.json({
          threads: notificationDeleted ? [] : [notified],
          inboxNotifications: notificationDeleted ? [] : [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        })
      ),
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications/delta", () =>
        delta([], [{ roomId: "room", access: revoked ? "inbox" : "room" }])
      )
    );
    const { store } = getLiveblocksExtrasForClient(client);
    await store.outputs.loadingRoomThreads
      .getOrCreate('["room",{}]')
      .waitUntilLoaded();
    await store.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    revoked = true;
    client.logout();
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
    expect(store.threads.get(notified.id)).toEqual(notified);
    expect(store.threads.get(unrelated.id)).toBeUndefined();
    store.updateThreadifications([unrelated], [], []);
    expect(store.threads.get(unrelated.id)).toBeUndefined();
    const updated = { ...notified, metadata: { updated: true } };
    store.updateThreadifications([updated], [notification], []);
    expect(store.threads.get(notified.id)).toEqual(updated);
    notificationDeleted = true;
    if (deletion === "delta") {
      store.updateThreadifications(
        [],
        [],
        [],
        [],
        [
          {
            type: "deletedInboxNotification",
            id: notification.id,
            roomId: notification.roomId,
            deletedAt: new Date(),
          },
        ]
      );
    } else if (deletion === "delete") {
      store.deleteInboxNotification(notification.id, "delete-notification");
    } else {
      store.deleteAllInboxNotifications("delete-notifications");
    }
    expect(store.threads.get(notified.id)).toBeUndefined();
    revoked = false;
    client.logout();
    await store.fetchNotificationsDeltaUpdate(new AbortController().signal);
    expect(store.threads.get(unrelated.id)).toEqual(unrelated);
  }
);
