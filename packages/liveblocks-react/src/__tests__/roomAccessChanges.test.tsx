import { Promise_withResolvers } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { dummyThreadData, dummyThreadInboxNotificationData } from "./_dummies";
import {
  mockGetInboxNotifications,
  mockGetInboxNotificationsDelta,
} from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});
afterAll(() => server.close());

describe("Room access changes", () => {
  test.each(["inbox-notifications", "threads"])(
    "retries a discarded %s delta before advancing its cursor",
    async (source) => {
      const initialRequestedAt = "2026-01-01T00:00:00.000Z";
      const requestedAt = "2026-01-01T00:03:00.000Z";
      const thread = dummyThreadData({
        roomId: "room",
        updatedAt: new Date(initialRequestedAt),
      });
      const updatedThread = {
        ...thread,
        updatedAt: new Date("2026-01-01T00:02:30.000Z"),
        metadata: { version: 1 },
      };
      const notification = dummyThreadInboxNotificationData({
        roomId: thread.roomId,
        threadId: thread.id,
        notifiedAt: updatedThread.updatedAt,
      });
      const started = Promise_withResolvers<void>();
      const release = Promise_withResolvers<void>();
      const sinceValues: (string | null)[] = [];
      let canRead = true;
      server.use(
        http.get("https://api.liveblocks.io/v2/c/:resource", () =>
          HttpResponse.json({
            threads: canRead ? [thread] : [],
            inboxNotifications: [],
            subscriptions: [],
            groups: [],
            meta: {
              requestedAt: initialRequestedAt,
              nextCursor: null,
              permissionHints: {},
            },
          })
        ),
        http.get(
          "https://api.liveblocks.io/v2/c/:resource/delta",
          async ({ request, params }) => {
            const isDelayedPoller = params.resource === source;
            const since = new URL(request.url).searchParams.get("since");
            if (isDelayedPoller) {
              sinceValues.push(since);
              if (sinceValues.length === 1) {
                started.resolve();
                await release.promise;
              }
            }
            const hasUpdate =
              isDelayedPoller &&
              since !== null &&
              new Date(since) <= updatedThread.updatedAt;
            return HttpResponse.json({
              threads: hasUpdate ? [updatedThread] : [],
              inboxNotifications: hasUpdate ? [notification] : [],
              subscriptions: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: isDelayedPoller
                  ? requestedAt
                  : "2026-01-01T00:02:00.000Z",
                permissionHints: {},
                roomAccesses: [{ roomId: thread.roomId, canRead }],
              },
            });
          }
        )
      );
      const { umbrellaStore } = createContextsForTest();
      await umbrellaStore.outputs.loadingNotifications
        .getOrCreate("{}")
        .waitUntilLoaded();
      await umbrellaStore.outputs.loadingUserThreads
        .getOrCreate("{}")
        .waitUntilLoaded();
      const poll =
        source === "inbox-notifications"
          ? umbrellaStore.fetchNotificationsDeltaUpdate
          : umbrellaStore.fetchUserThreadsDeltaUpdate;
      const changeAccess =
        source === "inbox-notifications"
          ? umbrellaStore.fetchUserThreadsDeltaUpdate
          : umbrellaStore.fetchNotificationsDeltaUpdate;
      const signal = new AbortController().signal;
      canRead = false;
      await changeAccess(signal);
      const pending$ = poll(signal);
      await started.promise;
      canRead = true;
      await changeAccess(signal);
      release.resolve();
      await pending$;
      await poll(signal);
      await poll(signal);
      expect(sinceValues).toEqual([
        initialRequestedAt,
        initialRequestedAt,
        requestedAt,
      ]);
      expect(umbrellaStore.threads.get(thread.id)).toEqual(updatedThread);
      expect(
        umbrellaStore.notifications.signal.get().get(notification.id)
      ).toEqual(notification);
    }
  );

  test.each(["page", "delta"])(
    "a fresh room %s restores access without a user poller",
    async (source) => {
      const thread = dummyThreadData({ roomId: "room" });
      let revoked = false;
      server.use(
        mockGetInboxNotifications(() =>
          HttpResponse.json({
            threads: revoked ? [] : [thread],
            inboxNotifications: [],
            subscriptions: [],
            groups: [],
            meta: {
              requestedAt: "2026-01-01T00:00:00.000Z",
              nextCursor: null,
            },
          })
        ),
        mockGetInboxNotificationsDelta(() =>
          HttpResponse.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: "2026-01-01T00:01:00.000Z",
              roomAccesses: [{ roomId: thread.roomId, canRead: !revoked }],
            },
          })
        ),
        http.get("https://api.liveblocks.io/v2/c/rooms/room/threads", () => {
          if (revoked)
            return HttpResponse.json({ message: "Forbidden" }, { status: 403 });
          return HttpResponse.json({
            data: [thread],
            inboxNotifications: [],
            subscriptions: [],
            meta: {
              requestedAt: "2026-01-01T00:02:00.000Z",
              nextCursor: null,
              permissionHints: { room: ["room:write"] },
            },
          });
        }),
        http.get(
          "https://api.liveblocks.io/v2/c/rooms/room/threads/delta",
          () =>
            HttpResponse.json({
              data: [],
              inboxNotifications: [],
              subscriptions: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: "2026-01-01T00:03:00.000Z",
                permissionHints: { room: ["room:write"] },
              },
            })
        )
      );
      const { umbrellaStore } = createContextsForTest();
      await umbrellaStore.outputs.loadingNotifications
        .getOrCreate("{}")
        .waitUntilLoaded();
      const room =
        umbrellaStore.outputs.loadingRoomThreads.getOrCreate('["room",{}]');
      if (source === "delta") await room.waitUntilLoaded();
      revoked = true;
      const signal = new AbortController().signal;
      await umbrellaStore.fetchNotificationsDeltaUpdate(signal);
      expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
      revoked = false;
      if (source === "page") {
        await room.waitUntilLoaded();
      } else {
        await umbrellaStore.fetchRoomThreadsDeltaUpdate(thread.roomId, signal);
      }
      expect(room.signal.get()).toMatchObject({
        threads: [{ id: thread.id }],
      });
      expect(umbrellaStore.threads.get(thread.id)).toEqual(thread);
    }
  );

  test.each(["stale", "missing"])(
    "a %s room response cannot clear a newer denial",
    async (source) => {
      const thread = dummyThreadData({ roomId: "room" });
      const started = Promise_withResolvers<void>();
      const release = Promise_withResolvers<void>();
      let revoked = false;
      server.use(
        mockGetInboxNotifications(() =>
          HttpResponse.json({
            threads: revoked ? [] : [thread],
            inboxNotifications: [],
            subscriptions: [],
            groups: [],
            meta: { requestedAt: new Date().toISOString(), nextCursor: null },
          })
        ),
        mockGetInboxNotificationsDelta(() =>
          HttpResponse.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              roomAccesses: [{ roomId: thread.roomId, canRead: !revoked }],
            },
          })
        ),
        http.get(
          "https://api.liveblocks.io/v2/c/rooms/room/threads",
          async () => {
            if (source === "missing")
              return HttpResponse.json(
                { message: "Not found" },
                { status: 404 }
              );
            if (revoked)
              return HttpResponse.json(
                { message: "Forbidden" },
                { status: 403 }
              );
            started.resolve();
            await release.promise;
            return HttpResponse.json({
              data: [thread],
              inboxNotifications: [],
              subscriptions: [],
              meta: {
                requestedAt: new Date().toISOString(),
                nextCursor: null,
                permissionHints: { room: ["room:write"] },
              },
            });
          }
        )
      );
      const { umbrellaStore } = createContextsForTest();
      await umbrellaStore.outputs.loadingNotifications
        .getOrCreate("{}")
        .waitUntilLoaded();
      const room =
        umbrellaStore.outputs.loadingRoomThreads.getOrCreate('["room",{}]');
      const load$ = source === "stale" ? room.waitUntilLoaded() : undefined;
      if (source === "stale") await started.promise;
      revoked = true;
      const revoke$ = umbrellaStore.fetchNotificationsDeltaUpdate(
        new AbortController().signal
      );
      await vi.waitFor(() =>
        expect(umbrellaStore.threads.get(thread.id)).toBeUndefined()
      );
      release.resolve();
      await load$;
      await revoke$;
      if (source === "missing") await room.waitUntilLoaded();
      umbrellaStore.updateThreadifications([thread], [], []);
      expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
      expect(room.signal.get()).toMatchObject({ threads: [] });
    }
  );

  test.each(["inbox", "user threads", "room threads"])(
    "uses the server's first-page cursor to refresh %s",
    async (source) => {
      const cursors: (string | null)[] = [];
      const writerHints: boolean[] = [];
      const endpoint =
        source === "inbox"
          ? "inbox-notifications"
          : source === "user threads"
            ? "threads"
            : "rooms/room/threads";
      server.use(
        http.get(
          `https://api.liveblocks.io/v2/c/${endpoint}`,
          ({ request }) => {
            const query = new URL(request.url).searchParams;
            const cursor = query.get("cursor");
            cursors.push(cursor);
            writerHints.push(query.has("readFromWriter"));
            return HttpResponse.json({
              data: [],
              threads: [],
              inboxNotifications: [],
              subscriptions: [],
              groups: [],
              meta: {
                requestedAt: "2026-01-01T00:00:00.000Z",
                nextCursor: cursor === "next-page" ? null : "next-page",
                refreshCursor: "restart-list",
                permissionHints: {},
              },
            });
          }
        )
      );
      const { umbrellaStore } = createContextsForTest();
      const resource =
        source === "inbox"
          ? umbrellaStore.outputs.loadingNotifications.getOrCreate("{}")
          : source === "user threads"
            ? umbrellaStore.outputs.loadingUserThreads.getOrCreate("{}")
            : umbrellaStore.outputs.loadingRoomThreads.getOrCreate(
                '["room",{}]'
              );
      await resource.waitUntilLoaded();
      if (resource.refresh === undefined)
        throw new Error("Expected a refreshable list");
      await resource.refresh();
      const result = resource.signal.get();
      if (result.isLoading || result.error)
        throw new Error("Expected a loaded list");
      result.fetchMore();
      await vi.waitFor(() =>
        expect(resource.signal.get()).toMatchObject({
          hasFetchedAll: true,
          isFetchingMore: false,
        })
      );
      expect(cursors).toEqual([null, "restart-list", "next-page"]);
      expect(writerHints).toEqual([false, false, false]);
    }
  );

  test.each(["page", "delta"])(
    "keeps both pollers working after a roomless custom notification arrives in a %s",
    async (source) => {
      const thread = dummyThreadData({ roomId: "readable-room" });
      const notification = {
        id: "in_000000000000000000001",
        kind: "$custom",
        subjectId: "custom-subject",
        roomId: null,
        notifiedAt: "2026-01-01T00:00:00.000Z",
        readAt: null,
        activities: [],
      };
      const readAt = "2026-01-01T00:01:00.000Z";
      const sentRoomIds: unknown[] = [];
      server.use(
        http.get("https://api.liveblocks.io/v2/c/inbox-notifications", () =>
          HttpResponse.json({
            threads: [thread],
            inboxNotifications: source === "page" ? [notification] : [],
            subscriptions: [],
            groups: [],
            meta: { requestedAt: notification.notifiedAt, nextCursor: null },
          })
        ),
        http.get("https://api.liveblocks.io/v2/c/threads", () =>
          HttpResponse.json({
            threads: [thread],
            inboxNotifications: [],
            subscriptions: [],
            meta: {
              requestedAt: notification.notifiedAt,
              nextCursor: null,
              permissionHints: {},
            },
          })
        ),
        http.get(
          "https://api.liveblocks.io/v2/c/:resource/delta",
          ({ request, params }) => {
            const roomIds: unknown = JSON.parse(
              new URL(request.url).searchParams.get("roomIds") ?? "[]"
            );
            sentRoomIds.push(roomIds);
            if (
              !Array.isArray(roomIds) ||
              roomIds.some((roomId) => typeof roomId !== "string")
            ) {
              return HttpResponse.json(
                { message: "Invalid roomIds" },
                { status: 422 }
              );
            }
            return HttpResponse.json({
              threads: [],
              inboxNotifications:
                params.resource === "inbox-notifications"
                  ? [{ ...notification, readAt }]
                  : [],
              subscriptions: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: readAt,
                permissionHints: {},
                roomAccesses: [{ roomId: thread.roomId, canRead: true }],
              },
            });
          }
        )
      );
      const { umbrellaStore } = createContextsForTest();
      const inbox =
        umbrellaStore.outputs.loadingNotifications.getOrCreate("{}");
      await inbox.waitUntilLoaded();
      await umbrellaStore.outputs.loadingUserThreads
        .getOrCreate("{}")
        .waitUntilLoaded();
      for (let poll = 0; poll < 2; poll++) {
        await umbrellaStore.fetchNotificationsDeltaUpdate(
          new AbortController().signal
        );
        await umbrellaStore.fetchUserThreadsDeltaUpdate(
          new AbortController().signal
        );
      }
      expect(sentRoomIds).toEqual(
        Array.from({ length: 4 }, () => [thread.roomId])
      );
      expect(inbox.signal.get()).toMatchObject({
        inboxNotifications: [{ id: notification.id, readAt: new Date(readAt) }],
      });
      expect(umbrellaStore.threads.get(thread.id)).toEqual(thread);
    }
  );

  test("polls a revoked room without connecting, then restores unchanged threads", async () => {
    vi.useFakeTimers();
    const thread = dummyThreadData({ roomId: "private-room" });
    const otherThread = dummyThreadData({ roomId: "other-room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    const otherNotification = dummyThreadInboxNotificationData({
      roomId: otherThread.roomId,
      threadId: otherThread.id,
    });
    let readable = true;
    const writerHints: boolean[] = [];
    const cursors: (string | null)[] = [];
    server.use(
      mockGetInboxNotifications(({ request }) => {
        writerHints.push(
          new URL(request.url).searchParams.has("readFromWriter")
        );
        cursors.push(new URL(request.url).searchParams.get("cursor"));
        return HttpResponse.json({
          threads: readable ? [thread, otherThread] : [otherThread],
          inboxNotifications: readable
            ? [notification, otherNotification]
            : [otherNotification],
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            refreshCursor: "restart-list",
          },
        });
      }),
      mockGetInboxNotificationsDelta(() =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: thread.roomId, canRead: readable }],
          },
        })
      )
    );
    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
      umbrellaStore,
    } = createContextsForTest();
    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toHaveLength(2)
    );
    readable = false;
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toEqual([otherNotification])
    );
    expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();

    readable = true;
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toHaveLength(2)
    );
    expect(umbrellaStore.threads.get(thread.id)).toEqual(thread);
    await act(() =>
      umbrellaStore.outputs.loadingNotifications
        .getOrCreate('{"kind":"thread"}')
        .waitUntilLoaded()
    );
    expect(cursors).toEqual([
      null,
      "restart-list",
      "restart-list",
      "restart-list",
    ]);
    expect(writerHints).toEqual([false, false, false, false]);
    unmount();
  });

  test("retries a failed refresh before advancing the inbox cursor", async () => {
    const thread = dummyThreadData({ roomId: "revoked-room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    const sinceValues: (string | null)[] = [];
    let revoked = false;
    let failRefresh = true;
    server.use(
      mockGetInboxNotifications(() => {
        if (revoked && failRefresh) {
          failRefresh = false;
          return HttpResponse.json(
            {
              threads: [],
              inboxNotifications: [],
              subscriptions: [],
              groups: [],
              meta: {
                requestedAt: "2026-01-01T00:00:00.000Z",
                nextCursor: null,
              },
            },
            { status: 503 }
          );
        }
        return HttpResponse.json({
          threads: revoked ? [] : [thread],
          inboxNotifications: revoked ? [] : [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        });
      }),
      mockGetInboxNotificationsDelta(({ request }) => {
        sinceValues.push(new URL(request.url).searchParams.get("since"));
        return HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: "2026-01-01T00:01:00.000Z",
            roomAccesses: [{ roomId: thread.roomId, canRead: false }],
          },
        });
      })
    );
    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
      umbrellaStore,
    } = createContextsForTest();
    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toHaveLength(1)
    );
    revoked = true;
    await act(async () => {
      await expect(
        umbrellaStore.fetchNotificationsDeltaUpdate(
          new AbortController().signal
        )
      ).rejects.toThrow();
    });
    await act(() =>
      umbrellaStore.fetchNotificationsDeltaUpdate(new AbortController().signal)
    );
    expect(result.current.inboxNotifications).toEqual([]);
    expect(sinceValues).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z",
    ]);
    unmount();
  });

  test("discards an older page that arrives after room invalidation", async () => {
    const thread = dummyThreadData({ roomId: "revoked-room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    let revoked = false;
    let pageStarted = false;
    let releasePage = () => {};
    const page$ = new Promise<void>((resolve) => {
      releasePage = resolve;
    });
    server.use(
      mockGetInboxNotifications(async ({ request }) => {
        const wasRevoked = revoked;
        if (new URL(request.url).searchParams.has("cursor")) {
          pageStarted = true;
          await page$;
        }
        return HttpResponse.json({
          threads: wasRevoked ? [] : [thread],
          inboxNotifications: wasRevoked ? [] : [notification],
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: wasRevoked ? null : "page-2",
          },
        });
      }),
      mockGetInboxNotificationsDelta(() =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: thread.roomId, canRead: false }],
          },
        })
      )
    );
    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
      umbrellaStore,
    } = createContextsForTest();
    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toHaveLength(1)
    );
    await act(async () => {
      result.current.fetchMore?.();
      await vi.waitFor(() => expect(pageStarted).toBe(true));
    });
    revoked = true;
    await act(async () => {
      const delta$ = umbrellaStore.fetchNotificationsDeltaUpdate(
        new AbortController().signal
      );
      await vi.waitFor(() =>
        expect(umbrellaStore.threads.get(thread.id)).toBeUndefined()
      );
      releasePage();
      await delta$;
    });
    expect(result.current.inboxNotifications).toEqual([]);
    expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
    unmount();
  });

  test("keeps revoked rooms out of later pages after a refresh", async () => {
    const revokedThread = dummyThreadData({ roomId: "revoked-room" });
    const olderThread = dummyThreadData({ roomId: revokedThread.roomId });
    const allowedThread = dummyThreadData({ roomId: "allowed-room" });
    let revoked = false;
    const writerHints: boolean[] = [];
    server.use(
      mockGetInboxNotifications(({ request }) => {
        const query = new URL(request.url).searchParams;
        writerHints.push(query.has("readFromWriter"));
        const threads = !revoked
          ? [revokedThread]
          : query.has("cursor")
            ? [olderThread]
            : [allowedThread];
        return HttpResponse.json({
          threads,
          inboxNotifications: threads.map((thread) =>
            dummyThreadInboxNotificationData({
              roomId: thread.roomId,
              threadId: thread.id,
            })
          ),
          subscriptions: [],
          groups: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: query.has("cursor") ? null : "next-page",
          },
        });
      }),
      mockGetInboxNotificationsDelta(() =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: revokedThread.roomId, canRead: false }],
          },
        })
      )
    );
    const { umbrellaStore } = createContextsForTest();
    const resource =
      umbrellaStore.outputs.loadingNotifications.getOrCreate("{}");
    await resource.waitUntilLoaded();
    revoked = true;
    await umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    const result = resource.signal.get();
    if (result.isLoading || result.error)
      throw new Error("Expected a loaded inbox");
    result.fetchMore();
    await vi.waitFor(() =>
      expect(resource.signal.get()).toMatchObject({
        hasFetchedAll: true,
        isFetchingMore: false,
      })
    );
    expect(umbrellaStore.threads.get(olderThread.id)).toBeUndefined();
    expect(writerHints).toEqual([false, false, false]);
  });

  test("blocks stale data while denied and ignores an older access response", async () => {
    const thread = dummyThreadData({ roomId: "private-room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    let denied = false;
    let pollCount = 0;
    const staleResponse = Promise_withResolvers<void>();
    const started = Promise_withResolvers<void>();
    server.use(
      mockGetInboxNotifications(() =>
        HttpResponse.json({
          threads: denied ? [] : [thread],
          inboxNotifications: denied ? [] : [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: new Date().toISOString(), nextCursor: null },
        })
      ),
      mockGetInboxNotificationsDelta(async () => {
        const canRead = !denied;
        if (++pollCount === 1) {
          started.resolve();
          await staleResponse.promise;
        }
        return HttpResponse.json({
          threads: canRead ? [thread] : [],
          inboxNotifications: canRead ? [notification] : [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: thread.roomId, canRead }],
          },
        });
      })
    );
    const { umbrellaStore } = createContextsForTest();
    await umbrellaStore.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    const stalePoll$ = umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    await started.promise;
    denied = true;
    await umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    staleResponse.resolve();
    await stalePoll$;
    umbrellaStore.updateThreadifications([thread], [notification], []);
    expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
    expect(umbrellaStore.notifications.signal.get().size).toBe(0);
    denied = false;
    await umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    expect(umbrellaStore.threads.get(thread.id)).toEqual(thread);
  });

  test("invalidates unsubscribed user threads and keeps their cursor independent", async () => {
    const thread = dummyThreadData({ roomId: "unsubscribed-room" });
    const sinceValues: (string | null)[] = [];
    const knownRooms: unknown[] = [];
    let revoked = false;
    server.use(
      http.get("https://api.liveblocks.io/v2/c/threads", () =>
        HttpResponse.json({
          threads: revoked ? [] : [thread],
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
        "https://api.liveblocks.io/v2/c/threads/delta",
        ({ request }) => {
          const query = new URL(request.url).searchParams;
          sinceValues.push(query.get("since"));
          knownRooms.push(JSON.parse(query.get("roomIds") ?? "[]"));
          return HttpResponse.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: "2026-01-01T00:01:00.000Z",
              permissionHints: {},
              roomAccesses: [
                {
                  roomId: thread.roomId,
                  canRead: false,
                },
              ],
            },
          });
        }
      )
    );
    const {
      liveblocks: { LiveblocksProvider, useUserThreads_experimental },
      umbrellaStore,
    } = createContextsForTest();
    const { result, unmount } = renderHook(
      () => useUserThreads_experimental(),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );
    await vi.waitFor(() => expect(result.current.threads).toHaveLength(1));
    revoked = true;
    await act(() =>
      umbrellaStore.fetchUserThreadsDeltaUpdate(new AbortController().signal)
    );
    expect(result.current.threads).toEqual([]);
    await act(() =>
      umbrellaStore.fetchUserThreadsDeltaUpdate(new AbortController().signal)
    );
    expect(sinceValues).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:01:00.000Z",
    ]);
    expect(knownRooms).toEqual([[thread.roomId], [thread.roomId]]);
    unmount();
  });

  test("one room marker removes more notifications than a delta batch can hold", async () => {
    const threads = Array.from({ length: 601 }, () =>
      dummyThreadData({ roomId: "large-room" })
    );
    const notifications = threads.map((thread) =>
      dummyThreadInboxNotificationData({
        roomId: thread.roomId,
        threadId: thread.id,
      })
    );
    let revoked = false;
    server.use(
      mockGetInboxNotifications(() =>
        HttpResponse.json({
          threads: revoked ? [] : threads,
          inboxNotifications: revoked ? [] : notifications,
          subscriptions: [],
          groups: [],
          meta: { requestedAt: new Date().toISOString(), nextCursor: null },
        })
      ),
      mockGetInboxNotificationsDelta(() =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: "large-room", canRead: false }],
          },
        })
      )
    );
    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
      umbrellaStore,
    } = createContextsForTest();
    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toHaveLength(601)
    );
    revoked = true;
    await act(() =>
      umbrellaStore.fetchNotificationsDeltaUpdate(new AbortController().signal)
    );
    expect(result.current.inboxNotifications).toEqual([]);
    expect(umbrellaStore.threads.findMany(undefined, undefined, "asc")).toEqual(
      []
    );
    unmount();
  });

  test.each(["inbox", "threads"])(
    "batches cached rooms for %s without repeating the data delta",
    async (source) => {
      const threads = Array.from({ length: 61 }, (_, index) =>
        dummyThreadData({ roomId: `room-${index}` })
      );
      const batches: { size: number; onlyChanges: boolean }[] = [];
      server.use(
        http.get("https://api.liveblocks.io/v2/c/threads", () =>
          HttpResponse.json({
            threads,
            inboxNotifications: [],
            subscriptions: [],
            meta: {
              requestedAt: "2026-01-01T00:00:00.000Z",
              nextCursor: null,
              permissionHints: {},
            },
          })
        ),
        mockGetInboxNotifications(() =>
          HttpResponse.json({
            threads,
            inboxNotifications: threads.map((thread) =>
              dummyThreadInboxNotificationData({
                roomId: thread.roomId,
                threadId: thread.id,
              })
            ),
            subscriptions: [],
            groups: [],
            meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
          })
        ),
        http.get(
          `https://api.liveblocks.io/v2/c/${source === "inbox" ? "inbox-notifications" : "threads"}/delta`,
          ({ request }) => {
            const query = new URL(request.url).searchParams;
            const roomIds: unknown = JSON.parse(query.get("roomIds") ?? "[]");
            if (!Array.isArray(roomIds))
              throw new Error("Expected a list of cached room IDs");
            batches.push({
              size: roomIds.length,
              onlyChanges: query.get("roomAccessesOnly") === "true",
            });
            return HttpResponse.json({
              threads: [],
              inboxNotifications: [],
              subscriptions: [],
              deletedThreads: [],
              deletedInboxNotifications: [],
              deletedSubscriptions: [],
              meta: {
                requestedAt: "2026-01-01T00:01:00.000Z",
                roomAccesses: [],
                permissionHints: {},
              },
            });
          }
        )
      );
      const {
        liveblocks: { LiveblocksProvider, useUserThreads_experimental },
        umbrellaStore,
      } = createContextsForTest();
      const { result, unmount } = renderHook(
        () => useUserThreads_experimental(),
        {
          wrapper: ({ children }) => (
            <LiveblocksProvider>{children}</LiveblocksProvider>
          ),
        }
      );
      await vi.waitFor(() => expect(result.current.threads).toHaveLength(61));
      if (source === "inbox") {
        await umbrellaStore.outputs.loadingNotifications
          .getOrCreate("{}")
          .waitUntilLoaded();
      }
      await act(() =>
        source === "inbox"
          ? umbrellaStore.fetchNotificationsDeltaUpdate(
              new AbortController().signal
            )
          : umbrellaStore.fetchUserThreadsDeltaUpdate(
              new AbortController().signal
            )
      );
      expect(batches).toEqual([
        { size: 50, onlyChanges: false },
        { size: 11, onlyChanges: true },
      ]);
      expect(result.current.threads).toHaveLength(61);
      unmount();
    }
  );

  test("keeps real deletion tombstones when a room invalidation arrives with them", async () => {
    const thread = dummyThreadData({ roomId: "deleted-room" });
    const notification = dummyThreadInboxNotificationData({
      roomId: thread.roomId,
      threadId: thread.id,
    });
    const deletedAt = new Date();
    let deleted = false;
    server.use(
      mockGetInboxNotifications(() =>
        HttpResponse.json({
          threads: deleted ? [] : [thread],
          inboxNotifications: deleted ? [] : [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: new Date().toISOString(), nextCursor: null },
        })
      ),
      http.get("https://api.liveblocks.io/v2/c/inbox-notifications/delta", () =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          deletedThreads: [
            {
              type: "deletedThread",
              id: thread.id,
              roomId: thread.roomId,
              deletedAt: deletedAt.toISOString(),
            },
          ],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: thread.roomId, canRead: false }],
          },
        })
      )
    );
    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
      umbrellaStore,
    } = createContextsForTest();
    const { result, unmount } = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });
    await vi.waitFor(() =>
      expect(result.current.inboxNotifications).toHaveLength(1)
    );
    deleted = true;
    await act(() =>
      umbrellaStore.fetchNotificationsDeltaUpdate(new AbortController().signal)
    );
    expect(result.current.inboxNotifications).toEqual([]);
    expect(
      umbrellaStore.threads.getEvenIfDeleted(thread.id)?.deletedAt
    ).toEqual(deletedAt);
    umbrellaStore.threads.upsert(thread);
    expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
    unmount();
  });

  test("a late createThread response cannot restore a denied room", async () => {
    const existing = dummyThreadData({ roomId: "revoked-room" });
    const pending = dummyThreadData({ roomId: existing.roomId });
    const notification = dummyThreadInboxNotificationData({
      roomId: existing.roomId,
      threadId: existing.id,
    });
    let revoked = false;
    server.use(
      mockGetInboxNotifications(() =>
        HttpResponse.json({
          threads: revoked ? [] : [existing],
          inboxNotifications: revoked ? [] : [notification],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        })
      ),
      mockGetInboxNotificationsDelta(() =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: [{ roomId: existing.roomId, canRead: false }],
          },
        })
      )
    );
    const { umbrellaStore } = createContextsForTest();
    await umbrellaStore.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    revoked = true;
    await umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    expect(umbrellaStore.threads.get(existing.id)).toBeUndefined();
    // Complete the mutation that started before access was revoked.
    umbrellaStore.createThread("pending-create", pending);
    await umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    expect(umbrellaStore.threads.get(pending.id)).toBeUndefined();
  });

  test.each(["delta", "event"])(
    "a deletion from %s after eviction blocks a late event response",
    async (source) => {
      const thread = dummyThreadData({
        roomId: "revoked-room",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      const notification = dummyThreadInboxNotificationData({
        roomId: thread.roomId,
        threadId: thread.id,
      });
      let phase: "initial" | "denied" | "restored" = "initial";
      server.use(
        mockGetInboxNotifications(() =>
          HttpResponse.json({
            threads: phase === "initial" ? [thread] : [],
            inboxNotifications: phase === "initial" ? [notification] : [],
            subscriptions: [],
            groups: [],
            meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
          })
        ),
        mockGetInboxNotificationsDelta(() =>
          HttpResponse.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            deletedThreads:
              phase === "restored" && source === "delta"
                ? [
                    {
                      type: "deletedThread",
                      id: thread.id,
                      roomId: thread.roomId,
                      deletedAt: "2026-01-01T00:01:00.000Z",
                    },
                  ]
                : [],
            meta: {
              requestedAt: new Date().toISOString(),
              roomAccesses: [
                { roomId: thread.roomId, canRead: phase === "restored" },
              ],
            },
          })
        )
      );
      const { umbrellaStore } = createContextsForTest();
      await umbrellaStore.outputs.loadingNotifications
        .getOrCreate("{}")
        .waitUntilLoaded();
      phase = "denied";
      await umbrellaStore.fetchNotificationsDeltaUpdate(
        new AbortController().signal
      );
      if (source === "event") umbrellaStore.deleteThread(thread.id, null);
      phase = "restored";
      await umbrellaStore.fetchNotificationsDeltaUpdate(
        new AbortController().signal
      );
      expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
      // Complete an earlier realtime fetch after access is restored.
      umbrellaStore.updateThreadifications([thread], [], []);
      expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
    }
  );

  test("checks access for rooms added by thread creation", async () => {
    const thread = dummyThreadData({ roomId: "created-room" });
    const requestedRooms: string[] = [];
    server.use(
      mockGetInboxNotifications(() =>
        HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          groups: [],
          meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
        })
      ),
      mockGetInboxNotificationsDelta(({ request }) => {
        const roomIds: string[] = JSON.parse(
          new URL(request.url).searchParams.get("roomIds") ?? "[]"
        );
        requestedRooms.push(...roomIds);
        return HttpResponse.json({
          threads: [],
          inboxNotifications: [],
          subscriptions: [],
          deletedThreads: [],
          deletedInboxNotifications: [],
          deletedSubscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            roomAccesses: roomIds.map((roomId) => ({ roomId, canRead: false })),
          },
        });
      })
    );
    const { umbrellaStore } = createContextsForTest();
    await umbrellaStore.outputs.loadingNotifications
      .getOrCreate("{}")
      .waitUntilLoaded();
    umbrellaStore.createThread("created-thread", thread);
    expect(umbrellaStore.threads.get(thread.id)).toEqual(thread);
    await umbrellaStore.fetchNotificationsDeltaUpdate(
      new AbortController().signal
    );
    expect(requestedRooms).toEqual([thread.roomId]);
    expect(umbrellaStore.threads.get(thread.id)).toBeUndefined();
  });

  test.each([true, false])(
    "hides optimistic creations after revocation with existing cache %s",
    async (hasExisting) => {
      const existing = dummyThreadData({ roomId: "revoked-room" });
      const pending = dummyThreadData({ roomId: existing.roomId });
      const unrelated = dummyThreadData({ roomId: "allowed-room" });
      const notification = dummyThreadInboxNotificationData({
        roomId: existing.roomId,
        threadId: existing.id,
      });
      let revoked = false;
      server.use(
        mockGetInboxNotifications(() =>
          HttpResponse.json({
            threads: revoked || !hasExisting ? [] : [existing],
            inboxNotifications: revoked || !hasExisting ? [] : [notification],
            subscriptions: [],
            groups: [],
            meta: { requestedAt: "2026-01-01T00:00:00.000Z", nextCursor: null },
          })
        ),
        mockGetInboxNotificationsDelta(({ request }) => {
          const roomIds: string[] = JSON.parse(
            new URL(request.url).searchParams.get("roomIds") ?? "[]"
          );
          return HttpResponse.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            deletedThreads: [],
            deletedInboxNotifications: [],
            deletedSubscriptions: [],
            meta: {
              requestedAt: new Date().toISOString(),
              roomAccesses: roomIds.map((roomId) => ({
                roomId,
                canRead: roomId !== existing.roomId,
              })),
            },
          });
        })
      );
      const { umbrellaStore } = createContextsForTest();
      await umbrellaStore.outputs.loadingNotifications
        .getOrCreate("{}")
        .waitUntilLoaded();
      const pendingId = umbrellaStore.optimisticUpdates.add({
        type: "create-thread",
        roomId: pending.roomId,
        thread: pending,
      });
      umbrellaStore.optimisticUpdates.add({
        type: "create-thread",
        roomId: unrelated.roomId,
        thread: unrelated,
      });
      expect(umbrellaStore.outputs.threads.get().get(pending.id)).toEqual(
        pending
      );
      revoked = true;
      await umbrellaStore.fetchNotificationsDeltaUpdate(
        new AbortController().signal
      );
      expect(umbrellaStore.threads.get(existing.id)).toBeUndefined();
      expect(
        umbrellaStore.outputs.threads.get().get(pending.id)
      ).toBeUndefined();
      expect(umbrellaStore.outputs.threads.get().get(unrelated.id)).toEqual(
        unrelated
      );
      expect(
        umbrellaStore.optimisticUpdates.signal
          .get()
          .some((update) => update.id === pendingId)
      ).toBe(true);
      umbrellaStore.createThread(pendingId, pending);
      expect(
        umbrellaStore.outputs.threads.get().get(pending.id)
      ).toBeUndefined();
      expect(
        umbrellaStore.optimisticUpdates.signal
          .get()
          .some((update) => update.id === pendingId)
      ).toBe(false);
    }
  );
});
