import type {
  MentionData,
  ResolveMentionSuggestionsArgs,
} from "@liveblocks/core";
import { nanoid } from "@liveblocks/core";
import { renderHook, waitFor } from "@testing-library/react";

import { useMentionSuggestions } from "../use-mention-suggestions";
import { act, createContextsForTest } from "./_utils";

// eslint-disable-next-line @typescript-eslint/require-await
async function defaultResolveMentionSuggestions({
  text,
}: ResolveMentionSuggestionsArgs) {
  return text.split("").map((id) => ({ kind: "user" as const, id }));
}

// eslint-disable-next-line @typescript-eslint/require-await
async function legacyResolveMentionSuggestions({
  text,
}: ResolveMentionSuggestionsArgs) {
  return text.split("");
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

    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions: defaultResolveMentionSuggestions,
    });

    const { result, unmount } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions(roomId, "abc"),
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

    expect(result.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "user", id: "c" },
    ]);

    unmount();
  });

  test("should update whenever the text changes", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions: defaultResolveMentionSuggestions,
    });

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(roomId, text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
    );

    expect(result.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "user", id: "c" },
    ]);

    rerender({ text: "123" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "1" },
        { kind: "user", id: "2" },
        { kind: "user", id: "3" },
      ])
    );

    expect(result.current.mentionSuggestions).toEqual([
      { kind: "user", id: "1" },
      { kind: "user", id: "2" },
      { kind: "user", id: "3" },
    ]);

    unmount();
  });

  test("should support multiple kinds of mentions", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions: () => [
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
        { kind: "group", id: "here", userIds: ["a", "b", "c"] },
        { kind: "group", id: "0" },
        { kind: "group", id: "1" },
      ],
    });

    const { result, unmount } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions(roomId, ""),
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

    expect(result.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "user", id: "c" },
      { kind: "group", id: "here", userIds: ["a", "b", "c"] },
      { kind: "group", id: "0" },
      { kind: "group", id: "1" },
    ]);

    unmount();
  });

  test("should invoke resolveMentionSuggestions with the expected arguments", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      ({ text }: ResolveMentionSuggestionsArgs) =>
        text.split("").map((id) => ({ kind: "user" as const, id }))
    );
    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions,
    });

    const { result, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(roomId, text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
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
      ({ text }: ResolveMentionSuggestionsArgs) =>
        text.split("").map((id) => ({ kind: "user" as const, id }))
    );
    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions,
    });

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(roomId, text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
    );

    rerender({ text: "123" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "1" },
        { kind: "user", id: "2" },
        { kind: "user", id: "3" },
      ])
    );

    // "abc" was already resolved so resolveMentionSuggestions should not be called again
    rerender({ text: "abc" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
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

  test("should invoke resolveMentionSuggestions again if its cache was invalidated", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      ({ text }: ResolveMentionSuggestionsArgs) =>
        text.split("").map((id) => ({ kind: "user" as const, id }))
    );
    const {
      client,
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions,
    });

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(roomId, text),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
        initialProps: { text: "abc" },
      }
    );

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
    );

    rerender({ text: "123" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "1" },
        { kind: "user", id: "2" },
        { kind: "user", id: "3" },
      ])
    );

    // Invalidate all mention suggestions
    act(() => client.resolvers.invalidateMentionSuggestions());

    rerender({ text: "abc" });

    await waitFor(() =>
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
    );

    expect(resolveMentionSuggestions).toHaveBeenCalledTimes(3);

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(1, {
      text: "abc",
      roomId,
    });

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(2, {
      text: "123",
      roomId,
    });

    expect(resolveMentionSuggestions).toHaveBeenNthCalledWith(3, {
      text: "abc",
      roomId,
    });

    unmount();
  });

  test("should debounce the invokations of resolveMentionSuggestions", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      ({ text }: ResolveMentionSuggestionsArgs) =>
        text.split("").map((id) => ({ kind: "user" as const, id }))
    );
    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions,
    });

    const { result, rerender, unmount } = renderHook(
      ({ text }: { text: string }) => ({
        mentionSuggestions: useMentionSuggestions(roomId, text),
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
      expect(result.current.mentionSuggestions).toEqual([
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "user", id: "c" },
      ])
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

  test("should filter out excluded mention kinds", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions: () => [
        { kind: "user", id: "a" },
        { kind: "user", id: "b" },
        { kind: "group", id: "here", userIds: ["a", "b"] },
        { kind: "agent", id: "agent-1" },
        { kind: "agent", id: "agent-2" },
      ],
    });

    const { result, unmount } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions(roomId, "", {
          excludedKinds: { agent: true },
        }),
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

    // Should exclude agent mentions but include user and group
    expect(result.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "group", id: "here", userIds: ["a", "b"] },
    ]);

    unmount();
  });

  test("should cache results regardless of excluded mention kinds", async () => {
    const roomId = nanoid();

    const resolveMentionSuggestions = jest.fn(
      (): Promise<MentionData[]> =>
        Promise.resolve([
          { kind: "user", id: "a" },
          { kind: "user", id: "b" },
          { kind: "group", id: "here", userIds: ["a", "b"] },
          { kind: "agent", id: "agent-1" },
          { kind: "agent", id: "agent-2" },
        ])
    );

    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions,
    });

    const { result: result1, unmount: unmount1 } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions(roomId, "test"),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result1.current.mentionSuggestions).not.toBeUndefined()
    );

    const { result: result2, unmount: unmount2 } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions(roomId, "test", {
          excludedKinds: { agent: true },
        }),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    await waitFor(() =>
      expect(result2.current.mentionSuggestions).not.toBeUndefined()
    );

    // First hook returned all mentions
    expect(result1.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "group", id: "here", userIds: ["a", "b"] },
      { kind: "agent", id: "agent-1" },
      { kind: "agent", id: "agent-2" },
    ]);

    // Second hook excluded agent mentions
    expect(result2.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "group", id: "here", userIds: ["a", "b"] },
    ]);

    // Both hooks should share the same cache so resolveMentionSuggestions should be called only once
    expect(resolveMentionSuggestions).toHaveBeenCalledTimes(1);

    unmount1();
    unmount2();
  });

  test("should still support returning string[] for backward compatibility", async () => {
    const roomId = nanoid();

    const {
      room: { RoomProvider },
    } = createContextsForTest({
      resolveMentionSuggestions: legacyResolveMentionSuggestions,
    });

    const { result, unmount } = renderHook(
      () => ({
        mentionSuggestions: useMentionSuggestions(roomId, "abc"),
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

    // Even though the resolver returns string[], the hook should normalize to MentionData[]
    expect(result.current.mentionSuggestions).toEqual([
      { kind: "user", id: "a" },
      { kind: "user", id: "b" },
      { kind: "user", id: "c" },
    ]);

    unmount();
  });
});
