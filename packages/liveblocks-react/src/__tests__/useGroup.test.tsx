import "@testing-library/jest-dom";

import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";

import { useGroup } from "../use-group";
import { dummyGroupData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockFindGroups, mockGetInboxNotifications } from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => {
  jest.useFakeTimers();
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
});

afterAll(() => {
  jest.useRealTimers();
  server.close();
});

describe("useGroup", () => {
  test("should return group data if the group exists", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest();

    server.use(
      mockFindGroups(async (req, res, ctx) => {
        const { groupIds } = await req.json();

        return res(
          ctx.json({
            groups: (groupIds as string[]).map((groupId) =>
              dummyGroupData({
                id: groupId,
                members: [
                  {
                    id: "user-0",
                    addedAt: new Date(),
                  },
                ],
              })
            ),
          })
        );
      })
    );

    const { result, unmount } = renderHook(
      () => ({
        group: useGroup("engineering"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.group).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.group.isLoading).toBeFalsy());

    expect(result.current.group).toEqual({
      isLoading: false,
      group: {
        id: "engineering",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    unmount();
  });

  test("should return undefined if the group does not exist", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest();

    server.use(
      mockFindGroups(async (_req, res, ctx) => {
        return res(
          ctx.json({
            groups: [],
          })
        );
      })
    );

    const { result, unmount } = renderHook(
      () => ({
        group: useGroup("design"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.group).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.group.isLoading).toBeFalsy());

    expect(result.current.group).toEqual({
      isLoading: false,
      group: undefined,
    });

    unmount();
  });

  test("should support changing group ID", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest();

    server.use(
      mockFindGroups(async (_req, res, ctx) => {
        return res(
          ctx.json({
            groups: [
              dummyGroupData({
                id: "engineering",
                members: [
                  {
                    id: "user-0",
                    addedAt: new Date(),
                  },
                ],
              }),
            ],
          })
        );
      })
    );

    const { result, rerender, unmount } = renderHook(
      ({ groupId }: { groupId: string }) => ({
        group: useGroup(groupId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { groupId: "engineering" },
      }
    );

    expect(result.current.group).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.group.isLoading).toBeFalsy());

    expect(result.current.group).toEqual({
      isLoading: false,
      group: {
        id: "engineering",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    rerender({ groupId: "design" });

    expect(result.current.group).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.group.isLoading).toBeFalsy());

    expect(result.current.group).toEqual({
      isLoading: false,
      group: undefined,
    });

    unmount();
  });

  test("should batch and deduplicate requests", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest();

    const mockFindGroupsObserver = jest.fn<void, [string[]]>();

    server.use(
      mockFindGroups(async (req, res, ctx) => {
        const { groupIds } = await req.json();

        mockFindGroupsObserver(groupIds);

        return res(
          ctx.json({
            groups: (groupIds as string[]).map((groupId) =>
              dummyGroupData({
                id: groupId,
                members: [
                  {
                    id: "user-0",
                    addedAt: new Date(),
                  },
                ],
              })
            ),
          })
        );
      })
    );

    const { result, unmount } = renderHook(
      () => ({
        groupEngineering: useGroup("engineering"),
        groupEngineering2: useGroup("engineering"),
        groupDesign: useGroup("design"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.groupEngineering.isLoading).toBeFalsy();
      expect(result.current.groupEngineering2.isLoading).toBeFalsy();
      expect(result.current.groupDesign.isLoading).toBeFalsy();
    });

    expect(result.current.groupEngineering).toEqual({
      isLoading: false,
      group: {
        id: "engineering",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    expect(result.current.groupEngineering2).toEqual({
      isLoading: false,
      group: {
        id: "engineering",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    expect(result.current.groupDesign).toEqual({
      isLoading: false,
      group: {
        id: "design",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    expect(mockFindGroupsObserver).toHaveBeenCalledTimes(1);
    expect(mockFindGroupsObserver).toHaveBeenCalledWith([
      "engineering",
      "design",
    ]);

    unmount();
  });

  test("should work outside of rooms and reuse groups fetched with inbox notifications", async () => {
    const {
      liveblocks: { LiveblocksProvider, useInboxNotifications },
    } = createContextsForTest();

    const mockFindGroupsObserver = jest.fn<void, [string[]]>();

    server.use(
      mockGetInboxNotifications(async (_req, res, ctx) => {
        return res(
          ctx.json({
            threads: [],
            inboxNotifications: [],
            subscriptions: [],
            groups: [
              dummyGroupData({
                id: "engineering",
                members: [{ id: "user-0", addedAt: new Date() }],
              }),
            ],
            meta: {
              requestedAt: new Date().toISOString(),
              nextCursor: null,
            },
          })
        );
      }),
      mockFindGroups(async (req, res, ctx) => {
        const { groupIds } = await req.json();

        mockFindGroupsObserver(groupIds);

        return res(
          ctx.json({
            groups: (groupIds as string[]).map((groupId) =>
              dummyGroupData({
                id: groupId,
                members: [
                  {
                    id: "user-0",
                    addedAt: new Date(),
                  },
                ],
              })
            ),
          })
        );
      })
    );

    // Fetching inbox notifications also brings groups in which the current user
    // is a member, "engineering" in this case.
    const _useInboxNotifications = renderHook(() => useInboxNotifications(), {
      wrapper: ({ children }) => (
        <LiveblocksProvider>{children}</LiveblocksProvider>
      ),
    });

    await waitFor(() =>
      expect(_useInboxNotifications.result.current).toEqual(
        expect.objectContaining({
          isLoading: false,
        })
      )
    );

    const _useGroup = renderHook(
      () => ({
        groupEngineering: useGroup("engineering"),
        groupDesign: useGroup("design"),
      }),
      {
        wrapper: ({ children }) => (
          <LiveblocksProvider>{children}</LiveblocksProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(_useGroup.result.current.groupEngineering.isLoading).toBeFalsy();
      expect(_useGroup.result.current.groupDesign.isLoading).toBeFalsy();
    });

    expect(_useGroup.result.current.groupEngineering).toEqual({
      isLoading: false,
      group: {
        id: "engineering",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    expect(_useGroup.result.current.groupDesign).toEqual({
      isLoading: false,
      group: {
        id: "design",
        scopes: { mention: true },
        members: [
          {
            id: "user-0",
            addedAt: expect.any(Date),
          },
        ],
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        organizationId: "default",
        tenantId: "default",
        type: "group",
      },
    });

    // The group "engineering" was already fetched with the inbox notifications
    // request, so it wasn't fetched again.
    expect(mockFindGroupsObserver).toHaveBeenCalledTimes(1);
    expect(mockFindGroupsObserver).toHaveBeenCalledWith(["design"]);

    _useInboxNotifications.unmount();
    _useGroup.unmount();
  });
});
