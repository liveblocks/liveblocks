import "@testing-library/jest-dom";

import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";

import { act, createContextsForTest } from "./_utils";

describe("useMetadata", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should return loading state initially", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider, useMetadata },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        metadata: useMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.metadata.isLoading).toBe(true);
    expect(result.current.metadata.metadata).toBe(null);
    expect(result.current.metadata.error).toBe(null);

    unmount();
  });

  test("should fetch metadata on mount", async () => {
    const roomId = nanoid();
    const mockMetadata = { status: "active", priority: "high" };

    const mockRoom = {
      getMetadata: jest.fn().mockResolvedValue(mockMetadata),
      updateMetadata: jest.fn(),
    };

    const {
      room: { RoomProvider, useMetadata },
    } = createContextsForTest();

    jest.spyOn(require("../room"), "useRoom").mockReturnValue(mockRoom);

    const { result, unmount } = renderHook(
      () => ({
        metadata: useMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(result.current.metadata.isLoading).toBe(false));

    expect(result.current.metadata.metadata).toEqual(mockMetadata);
    expect(result.current.metadata.error).toBe(null);
    expect(mockRoom.getMetadata).toHaveBeenCalledTimes(1);

    unmount();
  });

  test("should handle fetch error", async () => {
    const roomId = nanoid();
    const mockError = new Error("Failed to fetch metadata");

    const mockRoom = {
      getMetadata: jest.fn().mockRejectedValue(mockError),
      updateMetadata: jest.fn(),
    };

    const {
      room: { RoomProvider, useMetadata },
    } = createContextsForTest();

    jest.spyOn(require("../room"), "useRoom").mockReturnValue(mockRoom);

    const { result, unmount } = renderHook(
      () => ({
        metadata: useMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(result.current.metadata.isLoading).toBe(false));

    expect(result.current.metadata.metadata).toBe(null);
    expect(result.current.metadata.error).toEqual(mockError);

    unmount();
  });

  test("should update metadata successfully", async () => {
    const roomId = nanoid();
    const initialMetadata = { status: "active" };
    const updatedMetadata = { status: "active", priority: "high" };
    const updatePayload = { priority: "high" };

    const mockRoom = {
      getMetadata: jest.fn().mockResolvedValue(initialMetadata),
      updateMetadata: jest.fn().mockResolvedValue(updatedMetadata),
    };

    const {
      room: { RoomProvider, useMetadata },
    } = createContextsForTest();

    jest.spyOn(require("../room"), "useRoom").mockReturnValue(mockRoom);

    const { result, unmount } = renderHook(
      () => ({
        metadata: useMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(result.current.metadata.isLoading).toBe(false));

    expect(result.current.metadata.metadata).toEqual(initialMetadata);

    let updateResult;
    await act(async () => {
      updateResult = await result.current.metadata.updateMetadata(updatePayload);
    });

    expect(updateResult).toEqual(updatedMetadata);
    expect(result.current.metadata.metadata).toEqual(updatedMetadata);
    expect(mockRoom.updateMetadata).toHaveBeenCalledWith(updatePayload);

    unmount();
  });

  test("should handle update error", async () => {
    const roomId = nanoid();
    const initialMetadata = { status: "active" };
    const updateError = new Error("Failed to update metadata");
    const updatePayload = { priority: "high" };

    const mockRoom = {
      getMetadata: jest.fn().mockResolvedValue(initialMetadata),
      updateMetadata: jest.fn().mockRejectedValue(updateError),
    };

    const {
      room: { RoomProvider, useMetadata },
    } = createContextsForTest();

    jest.spyOn(require("../room"), "useRoom").mockReturnValue(mockRoom);

    const { result, unmount } = renderHook(
      () => ({
        metadata: useMetadata(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() => expect(result.current.metadata.isLoading).toBe(false));

    expect(result.current.metadata.metadata).toEqual(initialMetadata);

    await act(async () => {
      try {
        await result.current.metadata.updateMetadata(updatePayload);
      } catch (error) {
        expect(error).toEqual(updateError);
      }
    });

    expect(result.current.metadata.error).toEqual(updateError);

    unmount();
  });
});
