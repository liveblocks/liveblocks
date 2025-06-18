import "@testing-library/jest-dom";

import type { ResolveGroupsInfoArgs } from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { act, createContextsForTest } from "./_utils";

// eslint-disable-next-line @typescript-eslint/require-await
async function defaultResolveGroupsInfo({ groupIds }: ResolveGroupsInfoArgs) {
  return groupIds.map((groupId) => ({
    name: groupId,
  }));
}

describe("useGroupInfo", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should return an error if resolveGroupsInfo is not set", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo: undefined,
    });

    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      error: new Error(
        "resolveGroupsInfo didn't return anything for group 'abc'"
      ),
    });

    unmount();
  });

  test("should return the results from resolveGroupsInfo", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo: defaultResolveGroupsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    unmount();
  });

  test("should support changing group ID", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo: defaultResolveGroupsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ groupId }: { groupId: string }) => ({
        groupInfo: useGroupInfo(groupId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { groupId: "abc" },
      }
    );

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    rerender({ groupId: "123" });

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      info: { name: "123" },
    });

    unmount();
  });

  test("should cache results based on group ID", async () => {
    const roomId = nanoid();

    const resolveGroupsInfo = jest.fn(({ groupIds }: ResolveGroupsInfoArgs) =>
      groupIds.map((groupId) => ({ name: groupId }))
    );
    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ groupId }: { groupId: string }) => ({
        groupInfo: useGroupInfo(groupId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { groupId: "abc" },
      }
    );

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    rerender({ groupId: "123" });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    rerender({ groupId: "abc" });

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(resolveGroupsInfo).toHaveBeenCalledTimes(2);

    expect(resolveGroupsInfo).toHaveBeenNthCalledWith(1, { groupIds: ["abc"] });

    expect(resolveGroupsInfo).toHaveBeenNthCalledWith(2, { groupIds: ["123"] });

    unmount();
  });

  test("should revalidate instantly if its cache is invalidated", async () => {
    const roomId = nanoid();

    const resolveGroupsInfo = jest.fn(({ groupIds }: ResolveGroupsInfoArgs) =>
      groupIds.map((groupId) => ({ name: groupId }))
    );
    const {
      client,
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo,
    });

    const { result, rerender, unmount } = renderHook(
      ({ groupId }: { groupId: string }) => ({
        groupInfo: useGroupInfo(groupId),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { groupId: "abc" },
      }
    );

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    rerender({ groupId: "123" });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    rerender({ groupId: "abc" });

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    // Invalidate all group IDs
    act(() => client.resolvers.invalidateGroupsInfo());

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(resolveGroupsInfo).toHaveBeenCalledTimes(3);

    expect(resolveGroupsInfo).toHaveBeenNthCalledWith(1, { groupIds: ["abc"] });

    expect(resolveGroupsInfo).toHaveBeenNthCalledWith(2, { groupIds: ["123"] });

    expect(resolveGroupsInfo).toHaveBeenNthCalledWith(3, { groupIds: ["abc"] });

    unmount();
  });

  test("should batch (and deduplicate) requests for the same group ID", async () => {
    const roomId = nanoid();

    const resolveGroupsInfo = jest.fn(({ groupIds }: ResolveGroupsInfoArgs) =>
      groupIds.map((groupId) => ({ name: groupId }))
    );
    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        groupInfoAbc: useGroupInfo("abc"),
        groupInfoAbc2: useGroupInfo("abc"),
        groupInfo123: useGroupInfo("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.groupInfoAbc.isLoading).toBeFalsy();
      expect(result.current.groupInfoAbc2.isLoading).toBeFalsy();
      expect(result.current.groupInfo123.isLoading).toBeFalsy();
    });

    expect(result.current.groupInfoAbc).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(result.current.groupInfoAbc2).toEqual({
      isLoading: false,
      info: { name: "abc" },
    });

    expect(result.current.groupInfo123).toEqual({
      isLoading: false,
      info: { name: "123" },
    });

    expect(resolveGroupsInfo).toHaveBeenCalledTimes(1);

    expect(resolveGroupsInfo).toHaveBeenCalledWith({
      groupIds: ["abc", "123"],
    });

    unmount();
  });

  test("should support resolveGroupsInfo throwing an error", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo: () => {
        throw new Error("error");
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      error: new Error("error"),
    });

    unmount();
  });

  test("should support resolveGroupsInfo returning a rejected promise", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo: () => {
        return Promise.reject("error");
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      error: "error",
    });

    unmount();
  });

  test("should return an error if resolveGroupsInfo returns undefined", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo: () => {
        return undefined;
      },
    });
    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.groupInfo).toEqual({ isLoading: true });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    expect(result.current.groupInfo).toEqual({
      isLoading: false,
      error: new Error(
        "resolveGroupsInfo didn't return anything for group 'abc'"
      ),
    });

    unmount();
  });

  test("should return an error if resolveGroupsInfo returns undefined for a specifc group ID", async () => {
    const roomId = nanoid();

    const resolveGroupsInfo = jest.fn(({ groupIds }: ResolveGroupsInfoArgs) =>
      groupIds.map((groupId) => {
        if (groupId === "abc") {
          return undefined;
        }

        return { name: groupId };
      })
    );
    const {
      room: { RoomProvider, useGroupInfo },
    } = createContextsForTest({
      resolveGroupsInfo,
    });
    const { result, unmount } = renderHook(
      () => ({
        groupInfoAbc: useGroupInfo("abc"),
        groupInfo123: useGroupInfo("123"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      expect(result.current.groupInfoAbc.isLoading).toBeFalsy();
      expect(result.current.groupInfo123.isLoading).toBeFalsy();
    });

    expect(result.current.groupInfoAbc).toEqual({
      isLoading: false,
      error: new Error(
        "resolveGroupsInfo didn't return anything for group 'abc'"
      ),
    });

    expect(result.current.groupInfo123).toEqual({
      isLoading: false,
      info: {
        name: "123",
      },
    });

    unmount();
  });
});

describe("useGroupInfoSuspense", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should suspend with Suspense", async () => {
    const roomId = nanoid();

    const {
      room: {
        RoomProvider,
        suspense: { useGroupInfo },
      },
    } = createContextsForTest({
      resolveGroupsInfo: defaultResolveGroupsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <Suspense fallback={<div>Loading</div>}>
              <div>Loaded</div>
              {children}
            </Suspense>
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      // Check if the Suspense fallback is displayed
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    unmount();
  });

  test("should suspend with Suspense again if its cache is invalidated", async () => {
    const roomId = nanoid();

    const {
      client,
      room: {
        RoomProvider,
        suspense: { useGroupInfo },
      },
    } = createContextsForTest({
      resolveGroupsInfo: defaultResolveGroupsInfo,
    });

    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <Suspense fallback={<div>Loading</div>}>
              <div>Loaded</div>
              {children}
            </Suspense>
          </RoomProvider>
        ),
      }
    );

    await waitFor(() => {
      // Check if the Suspense fallback is displayed
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    act(() => client.resolvers.invalidateGroupsInfo());

    await waitFor(() => {
      // Check if the Suspense fallback is displayed again
      expect(screen.getByText("Loading")).toBeInTheDocument();
    });

    await waitFor(() => expect(result.current.groupInfo.isLoading).toBeFalsy());

    await waitFor(() => {
      // Check if the Suspense fallback is no longer displayed again
      expect(screen.getByText("Loaded")).toBeInTheDocument();
    });

    unmount();
  });

  test("should trigger error boundaries with Suspense", async () => {
    const roomId = nanoid();

    const {
      room: {
        RoomProvider,
        suspense: { useGroupInfo },
      },
    } = createContextsForTest({
      resolveGroupsInfo: () => {
        throw new Error("error");
      },
    });

    const { result, unmount } = renderHook(
      () => ({
        groupInfo: useGroupInfo("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>
            <ErrorBoundary
              fallback={<div>There was an error while getting group info.</div>}
            >
              <Suspense fallback={<div>Loading</div>}>{children}</Suspense>
            </ErrorBoundary>
          </RoomProvider>
        ),
      }
    );

    expect(result.current).toEqual(null);

    await waitFor(() => {
      // Check if the error boundary fallback is displayed
      expect(
        screen.getByText("There was an error while getting group info.")
      ).toBeInTheDocument();
    });

    unmount();
  });
});
