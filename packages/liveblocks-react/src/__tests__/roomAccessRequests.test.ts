import { createClient } from "@liveblocks/client";
import {
  isPlainObject,
  kInternal,
  Promise_withResolvers,
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
    const otherTokenStarted = Promise_withResolvers<void>();
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
        `https://api.liveblocks.io/v2/c/${resource}/delta`,
        async ({ request }) => {
          const bearer = request.headers.get("Authorization") ?? "";
          const query = new URL(request.url).searchParams;
          const roomIds: string[] = JSON.parse(query.get("roomIds") ?? "[]");
          checks.push({
            token: bearer,
            roomIds,
            accessOnly: query.get("roomAccessesOnly") === "true",
            since: query.get("since"),
          });
          if (bearer === `Bearer ${tokens.get("room-b")}`)
            otherTokenStarted.resolve();
          else if (!deleted) await otherTokenStarted.promise;
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
                canRead:
                  bearer === `Bearer ${tokens.get(roomId)}` &&
                  !(deleted && roomId === "room-a"),
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
    expect(checks).toEqual([
      {
        token: `Bearer ${tokens.get("room-a")}`,
        roomIds: ["room-a"],
        accessOnly: false,
        since: "2026-01-01T00:00:00.000Z",
      },
      {
        token: `Bearer ${tokens.get("room-b")}`,
        roomIds: ["room-b"],
        accessOnly: true,
        since: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(store.threads.get(threads[0]!.id)).toEqual(threads[0]);
    expect(store.threads.get(threads[1]!.id)).toEqual(threads[1]);
    deleted = true;
    await poll(new AbortController().signal);
    expect(store.threads.get(threads[0]!.id)).toBeUndefined();
    expect(store.threads.get(threads[1]!.id)).toEqual(threads[1]);
    expect(checks.slice(2).map((check) => check.since)).toEqual([
      "2026-01-01T00:01:00.000Z",
      "2026-01-01T00:01:00.000Z",
    ]);
  }
);

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
            roomAccesses: [{ roomId: thread.roomId, canRead: true }],
          },
        })
      )
    );
    const { store } = getLiveblocksExtrasForClient(client);
    await store.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    const update$ = store.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    if (failure === "unavailable") await expect(update$).rejects.toBe(error);
    else await update$;
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
    const client = createClient({ authEndpoint: "https://example.com/auth" });
    server.use(
      http.post("https://example.com/auth", async ({ request }) => {
        const body: unknown = await request.json();
        if (isPlainObject(body) && body.room === thread.roomId)
          return new HttpResponse("room authentication failed", { status });
        return HttpResponse.json({ token: makeAccessToken("other-room") });
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
            roomAccesses: [{ roomId: thread.roomId, canRead: true }],
          },
        })
      )
    );
    const { store } = getLiveblocksExtrasForClient(client);
    await store.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    const update$ = store.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    if (status === 403) await update$;
    else await expect(update$).rejects.toThrow("room authentication failed");
    expect(store.threads.get(thread.id)).toEqual(thread);
    expect(store.notifications.signal.get().get(notification.id)).toEqual(
      notification
    );
  }
);

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
            roomAccesses: [{ roomId: thread.roomId, canRead: restored }],
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
    await vi.advanceTimersByTimeAsync(5_000);
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
