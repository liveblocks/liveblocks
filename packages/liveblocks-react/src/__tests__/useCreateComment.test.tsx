import {
  BaseMetadata,
  convertToThreadData,
  createClient,
} from "@liveblocks/core";
import { waitFor, renderHook, act } from "@testing-library/react";
import React from "react";

import { createRoomContext } from "../room";
import MockWebSocket from "./_MockWebSocket";
import { mockCreateComment, mockGetThreads } from "./_restMocks";
import { dummyCommentDataPlain, dummyThreadDataPlain } from "./_dummies";
import { addMinutes } from "date-fns";
import { setupServer } from "msw/node";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.instances = [];
});

afterEach(() => {
  MockWebSocket.instances = [];
  server.resetHandlers();
});

afterAll(() => server.close());

// TODO: Dry up and create utils that wrap renderHook
function createRoomContextForTest<
  TThreadMetadata extends BaseMetadata = BaseMetadata,
>() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return createRoomContext<{}, never, never, never, TThreadMetadata>(client);
}

describe("useCreateComment", () => {
  test("should create a comment optimistically and override with thread coming from server", async () => {
    const fakeCreatedAt = addMinutes(new Date(), 5);
    const initialThread = dummyThreadDataPlain();

    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (req, res, ctx) => {
          const json = await req.json();

          const comment = dummyCommentDataPlain();
          comment.id = json.id;
          comment.body = json.body;
          comment.createdAt = fakeCreatedAt.toISOString();
          comment.threadId = initialThread.id;

          return res(ctx.json(comment));
        }
      )
    );

    const { RoomProvider, useThreads, useCreateComment } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await waitFor(() =>
      expect(result.current.threads).toEqual(
        [initialThread].map(convertToThreadData)
      )
    );

    const comment = await act(() =>
      result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threads![0].comments[1]).toEqual(comment);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
      expect(result.current.threads![0].comments[1].createdAt).toEqual(
        fakeCreatedAt
      )
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const initialThread = dummyThreadDataPlain();

    server.use(
      mockGetThreads((_req, res, ctx) => {
        return res(
          ctx.json({
            data: [initialThread],
            inboxNotifications: [],
          })
        );
      }),
      mockCreateComment(
        { threadId: initialThread.id },
        async (_req, res, ctx) => {
          return res(ctx.status(500));
        }
      )
    );

    const { RoomProvider, useThreads, useCreateComment } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createComment: useCreateComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id="room-id" initialPresence={{}}>
            {children}
          </RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();
    await waitFor(() =>
      expect(result.current.threads).toEqual(
        [initialThread].map(convertToThreadData)
      )
    );

    const comment = await act(() =>
      result.current.createComment({
        threadId: initialThread.id,
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threads![0].comments[1]).toEqual(comment);

    // Wait for optimistic update to be rolled back
    await waitFor(() =>
      expect(result.current.threads).toEqual(
        [initialThread].map(convertToThreadData)
      )
    );

    unmount();
  });
});
