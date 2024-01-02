import type { CommentBody, ThreadDataPlain } from "@liveblocks/core";
import { createClient } from "@liveblocks/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { addMinutes } from "date-fns";
import type { ResponseComposition, RestContext, RestRequest } from "msw";
import { setupServer } from "msw/node";
import React from "react";

import { createRoomContext } from "../room";
import { dummyCommentDataPlain, dummyThreadDataPlain } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockCreateThread, mockGetThreads } from "./_restMocks";

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
function createRoomContextForTest() {
  const client = createClient({
    publicApiKey: "pk_xxx",
    polyfills: {
      WebSocket: MockWebSocket as any,
    },
  });

  return createRoomContext(client);
}

describe("useCreateThread", () => {
  test("should create a thread optimistically and override with thread coming from server", async () => {
    const fakeCreatedAt = addMinutes(new Date(), 5);

    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
          })
        );
      }),
      mockCreateThread(
        async (
          req: RestRequest,
          res: ResponseComposition<ThreadDataPlain<any>>,
          ctx: RestContext
        ) => {
          const json = await req.json<{
            id: string;
            comment: { id: string; body: CommentBody };
          }>();

          const comment = dummyCommentDataPlain();
          comment.threadId = json.id;
          comment.id = json.comment.id;
          comment.body = json.comment.body;
          comment.createdAt = fakeCreatedAt.toISOString();

          const thread = dummyThreadDataPlain();
          thread.id = json.id;
          thread.comments = [comment];
          thread.createdAt = fakeCreatedAt.toISOString();

          return res(ctx.json(thread));
        }
      )
    );

    const { RoomProvider, useThreads, useCreateThread } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createThread: useCreateThread(),
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

    await waitFor(() => expect(result.current.threads).toEqual([]));

    const thread = await act(() =>
      result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threads![0]).toEqual(thread);

    // We're using the createdDate overriden by the server to ensure the optimistic update have been properly deleted
    await waitFor(() =>
      expect(result.current.threads![0].createdAt).toEqual(fakeCreatedAt)
    );

    unmount();
  });

  test("should rollback optimistic update", async () => {
    server.use(
      mockGetThreads(async (_req, res, ctx) => {
        return res(
          ctx.json({
            data: [],
            inboxNotifications: [],
          })
        );
      }),
      mockCreateThread((_req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    const { RoomProvider, useThreads, useCreateThread } =
      createRoomContextForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        createThread: useCreateThread(),
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

    await waitFor(() => expect(result.current.threads).toEqual([]));

    const thread = await act(() =>
      result.current.createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      })
    );

    expect(result.current.threads).toEqual([thread]);

    // Wait for optimistic update to be rolled back
    await waitFor(() => expect(result.current.threads).toEqual([]));

    unmount();
  });
});
