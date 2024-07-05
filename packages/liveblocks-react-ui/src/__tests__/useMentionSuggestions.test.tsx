import type {
  BaseMetadata,
  BaseUserMeta,
  ClientOptions,
  JsonObject,
  ResolveMentionSuggestionsArgs,
} from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { createRoomContext } from "@liveblocks/react";
import { renderHook, waitFor } from "@testing-library/react";
import { nanoid } from "nanoid";
import React from "react";

import { useMentionSuggestions } from "../shared";
import { generateFakeJwt } from "./_utils";

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<M extends BaseMetadata>(
  options?: Omit<ClientOptions<BaseUserMeta>, "authEndpoint" | "publicApiKey">
) {
  const client = createClient({
    async authEndpoint() {
      return {
        token: await generateFakeJwt({ userId: "userId" }),
      };
    },
    // eslint-disable-next-line @typescript-eslint/require-await
    resolveMentionSuggestions: async ({ text }) => {
      return text.split("");
    },
    ...options,
  });

  return createRoomContext<JsonObject, never, never, never, M>(client);
}

describe("useMentionSuggestions", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("should return the results from resolveMentionSuggestions", async () => {
    const roomId = nanoid();

    const { RoomProvider } = createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions("abc"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.mentionSuggestions).toBeUndefined();

    await waitFor(() =>
      expect(result.current.mentionSuggestions).not.toBeUndefined()
    );

    expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"]);

    unmount();
  });

  test("should update whenever the text changes", async () => {
    const roomId = nanoid();

    const { RoomProvider } = createRoomContextForTest();

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"])
    );

    expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"]);

    rerender({ text: "123" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["1", "2", "3"])
    );

    expect(result.current.mentionSuggestions).toEqual(["1", "2", "3"]);

    unmount();
  });

  test("should invoke resolveMentionSuggestions with the expected arguments", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      ({ text }: ResolveMentionSuggestionsArgs) => text.split("")
    );
    const { RoomProvider } = createRoomContextForTest({
      resolveMentionSuggestions,
    });

    const { result, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"])
    );

    expect(resolveMentionSuggestions).toHaveBeenCalledWith({
      text: "abc",
      roomId,
    });

    unmount();
  });

  test("should cache results and not invoke resolveMentionSuggestions with previously provided arguments", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      ({ text }: ResolveMentionSuggestionsArgs) => text.split("")
    );
    const { RoomProvider } = createRoomContextForTest({
      resolveMentionSuggestions,
    });

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"])
    );

    rerender({ text: "123" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["1", "2", "3"])
    );

    // "abc" was already resolved so resolveMentionSuggestions should not be called again
    rerender({ text: "abc" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"])
    );

    expect(resolveMentionSuggestions).toHaveBeenCalledTimes(2);

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(1, {
      text: "abc",
      roomId,
    });

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(2, {
      text: "123",
      roomId,
    });

    unmount();
  });

  test("should debounce the invokations of resolveMentionSuggestions", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      ({ text }: ResolveMentionSuggestionsArgs) => text.split("")
    );
    const { RoomProvider } = createRoomContextForTest({
      resolveMentionSuggestions,
    });

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).not.toBeUndefined()
    );

    rerender({ text: "a" });
    rerender({ text: "ab" });
    rerender({ text: "abc" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual(["a", "b", "c"])
    );

    expect(resolveMentionSuggestions).toHaveBeenCalledTimes(2);

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(1, {
      text: "",
      roomId,
    });

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(2, {
      text: "abc",
      roomId,
    });

    unmount();
  });
});
