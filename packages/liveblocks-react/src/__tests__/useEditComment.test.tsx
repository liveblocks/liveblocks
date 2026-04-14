import type { BaseMetadata, CommentBody, Patchable } from "@liveblocks/core";
import { nanoid, Permission } from "@liveblocks/core";
import { act, renderHook } from "@testing-library/react";
import { addMinutes } from "date-fns";
import { HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import { dummyCommentData, dummyThreadData } from "./_dummies";
import MockWebSocket from "./_MockWebSocket";
import { mockEditComment, mockGetThreads } from "./_restMocks";
import { createContextsForTest } from "./_utils";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  MockWebSocket.reset();
});

afterEach(() => {
  MockWebSocket.reset();
  server.resetHandlers();
});

afterAll(() => server.close());

describe("useEditComment", () => {
  test("should edit comment body optimistically", async () => {
    const roomId = nanoid();
    const fakeEditedAt = addMinutes(new Date(), 5);
    const initialComment = dummyCommentData({
      roomId,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "Original" }] }],
      },
    });
    const initialThread = dummyThreadData({
      roomId,
      comments: [initialComment],
    });

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockEditComment(
        { threadId: initialThread.id, commentId: initialComment.id },
        async ({ request }) => {
          const json = (await request.json()) as {
            body: CommentBody;
            attachmentIds?: string[];
            metadata?: BaseMetadata;
          };

          const editedComment = dummyCommentData({
            roomId,
            threadId: initialThread.id,
            id: initialComment.id,
            body: json.body,
            editedAt: fakeEditedAt,
            metadata: json.metadata ?? initialComment.metadata,
          });

          return HttpResponse.json(editedComment);
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editComment: useEditComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const newBody: CommentBody = {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "Edited" }] }],
    };

    act(() =>
      result.current.editComment({
        threadId: initialThread.id,
        commentId: initialComment.id,
        body: newBody,
      })
    );

    expect(result.current.threads?.[0]?.comments[0]?.body).toEqual(newBody);
    expect(result.current.threads?.[0]?.comments[0]?.editedAt).toBeDefined();

    await vi.waitFor(() => {
      const comment = result.current.threads?.[0]?.comments[0];
      expect(comment?.editedAt).toEqual(fakeEditedAt);
      expect(comment?.body).toEqual(newBody);
    });

    unmount();
  });

  test("should edit comment with metadata optimistically", async () => {
    const roomId = nanoid();
    const fakeEditedAt = addMinutes(new Date(), 5);
    const initialComment = dummyCommentData({
      roomId,
      metadata: { priority: 1 },
    });
    const initialThread = dummyThreadData({
      roomId,
      comments: [initialComment],
    });

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockEditComment(
        { threadId: initialThread.id, commentId: initialComment.id },
        async ({ request }) => {
          const json = (await request.json()) as {
            body: CommentBody;
            metadata?: BaseMetadata;
          };

          const editedComment = dummyCommentData({
            roomId,
            threadId: initialThread.id,
            id: initialComment.id,
            body: json.body,
            editedAt: fakeEditedAt,
            metadata: json.metadata ?? initialComment.metadata,
          });

          return HttpResponse.json(editedComment);
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editComment: useEditComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const newBody: CommentBody = {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
    };
    const newMetadata: BaseMetadata = { priority: 2, reviewed: true };

    act(() =>
      result.current.editComment({
        threadId: initialThread.id,
        commentId: initialComment.id,
        body: newBody,
        metadata: newMetadata,
      })
    );

    expect(result.current.threads?.[0]?.comments[0]?.body).toEqual(newBody);
    expect(result.current.threads?.[0]?.comments[0]?.metadata).toEqual({
      priority: 2,
      reviewed: true,
    });
    expect(result.current.threads?.[0]?.comments[0]?.editedAt).toBeDefined();

    await vi.waitFor(() => {
      const comment = result.current.threads?.[0]?.comments[0];
      expect(comment?.editedAt).toEqual(fakeEditedAt);
      expect(comment?.body).toEqual(newBody);
      expect(comment?.metadata).toEqual(newMetadata);
    });

    unmount();
  });

  test("should edit comment body and metadata optimistically", async () => {
    const roomId = nanoid();
    const fakeEditedAt = addMinutes(new Date(), 5);
    const initialComment = dummyCommentData({
      roomId,
      metadata: { priority: 1, reviewed: false },
    });
    const initialThread = dummyThreadData({
      roomId,
      comments: [initialComment],
    });

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockEditComment(
        { threadId: initialThread.id, commentId: initialComment.id },
        async ({ request }) => {
          const json = (await request.json()) as {
            body: CommentBody;
            metadata?: Patchable<BaseMetadata>;
          };

          // Null values = deleted keys
          const serverMetadata: BaseMetadata = {};
          if (json.metadata) {
            for (const [key, value] of Object.entries(json.metadata)) {
              if (value !== null) {
                serverMetadata[key] = value as string | number | boolean;
              }
            }
          }

          const editedComment = dummyCommentData({
            roomId,
            threadId: initialThread.id,
            id: initialComment.id,
            body: json.body,
            editedAt: fakeEditedAt,
            metadata:
              Object.keys(serverMetadata).length > 0
                ? serverMetadata
                : initialComment.metadata,
          });

          return HttpResponse.json(editedComment);
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editComment: useEditComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const newBody: CommentBody = {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
    };

    act(() =>
      result.current.editComment({
        threadId: initialThread.id,
        commentId: initialComment.id,
        body: newBody,
        metadata: {
          priority: 2,
          reviewed: null,
        },
      })
    );

    expect(result.current.threads?.[0]?.comments[0]?.body).toEqual(newBody);
    expect(result.current.threads?.[0]?.comments[0]?.metadata).toEqual({
      priority: 2,
      reviewed: null,
    });

    await vi.waitFor(() => {
      const comment = result.current.threads?.[0]?.comments[0];
      expect(comment?.editedAt).toEqual(fakeEditedAt);
      expect(comment?.body).toEqual(newBody);
      expect(comment?.metadata).toEqual({ priority: 2 });
    });

    unmount();
  });

  test("should rollback optimistic update", async () => {
    const roomId = nanoid();
    const initialComment = dummyCommentData({
      roomId,
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "Original" }] }],
      },
    });
    const initialThread = dummyThreadData({
      roomId,
      comments: [initialComment],
    });

    server.use(
      mockGetThreads(() => {
        return HttpResponse.json({
          data: [initialThread],
          inboxNotifications: [],
          subscriptions: [],
          meta: {
            requestedAt: new Date().toISOString(),
            nextCursor: null,
            permissionHints: {
              [roomId]: [Permission.Write],
            },
          },
        });
      }),
      mockEditComment(
        { threadId: initialThread.id, commentId: initialComment.id },
        () => {
          return HttpResponse.json(null, { status: 500 });
        }
      )
    );

    const {
      room: { RoomProvider, useThreads, useEditComment },
    } = createContextsForTest();

    const { result, unmount } = renderHook(
      () => ({
        threads: useThreads().threads,
        editComment: useEditComment(),
      }),
      {
        wrapper: ({ children }) => (
          <RoomProvider id={roomId}>{children}</RoomProvider>
        ),
      }
    );

    expect(result.current.threads).toBeUndefined();

    await vi.waitFor(() =>
      expect(result.current.threads).toEqual([initialThread])
    );

    const newBody: CommentBody = {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "Edited" }] }],
    };

    act(() =>
      result.current.editComment({
        threadId: initialThread.id,
        commentId: initialComment.id,
        body: newBody,
      })
    );

    expect(result.current.threads?.[0]?.comments[0]?.body).toEqual(newBody);

    await vi.waitFor(() => {
      expect(result.current.threads?.[0]?.comments[0]?.body).toEqual(
        initialComment.body
      );
      expect(
        result.current.threads?.[0]?.comments[0]?.editedAt
      ).toBeUndefined();
    });

    unmount();
  });
});
