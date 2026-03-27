import type {
  BaseGroupInfo,
  BaseUserMeta,
  CommentBody,
  CommentData,
  ResolveGroupsInfoArgs,
  ResolveUsersArgs,
} from "@liveblocks/core";
import type { ChatInstance, Root } from "chat";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
  convertPostableMessageToCommentBody,
  getRoomIdFromChannelId,
  LiveblocksAdapter,
  type LiveblocksAdapterConfig,
} from "../adapter";

type AdapterConfig = LiveblocksAdapterConfig<BaseUserMeta, BaseGroupInfo>;

const mocks = vi.hoisted(() => {
  class MockLiveblocksError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    MockLiveblocksError,
    mockVerifyRequest: vi.fn(),
    mockGetComment: vi.fn(),
    mockGetThread: vi.fn(),
    mockGetThreads: vi.fn(),
    mockCreateComment: vi.fn(),
    mockEditComment: vi.fn(),
    mockDeleteComment: vi.fn(),
    mockAddCommentReaction: vi.fn(),
    mockRemoveCommentReaction: vi.fn(),
    mockCreateThread: vi.fn(),
    mockGetRoom: vi.fn(),
    mockGetAttachment: vi.fn(),
  };
});

vi.mock("@liveblocks/node", () => ({
  Liveblocks: vi.fn(function () {
    return {
      getComment: mocks.mockGetComment,
      getThread: mocks.mockGetThread,
      getThreads: mocks.mockGetThreads,
      createComment: mocks.mockCreateComment,
      editComment: mocks.mockEditComment,
      deleteComment: mocks.mockDeleteComment,
      addCommentReaction: mocks.mockAddCommentReaction,
      removeCommentReaction: mocks.mockRemoveCommentReaction,
      createThread: mocks.mockCreateThread,
      getRoom: mocks.mockGetRoom,
      getAttachment: mocks.mockGetAttachment,
    };
  }),
  WebhookHandler: vi.fn(function () {
    return {
      verifyRequest: mocks.mockVerifyRequest,
    };
  }),
  LiveblocksError: mocks.MockLiveblocksError,
}));

function createDummyAdapter(options?: {
  botUserId?: string;
  resolveUsers?: AdapterConfig["resolveUsers"];
  resolveGroupsInfo?: AdapterConfig["resolveGroupsInfo"];
}) {
  return new LiveblocksAdapter({
    apiKey: "sk_test_xxx",
    webhookSecret: "whsec_test_xxx",
    botUserId: options?.botUserId ?? "bot-user-id",
    botUserName: "Bot",
    resolveUsers: options?.resolveUsers,
    resolveGroupsInfo: options?.resolveGroupsInfo,
  });
}

function createDummyComment(
  overrides: Partial<CommentData> & { body: CommentBody }
): CommentData {
  return {
    type: "comment",
    id: "cm_1",
    threadId: "th_1",
    roomId: "room_1",
    userId: "user_1",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    reactions: [],
    attachments: [],
    metadata: {},
    ...overrides,
  };
}

function createDummyThread(
  comments: CommentData[],
  overrides?: Partial<{
    id: string;
    roomId: string;
    createdAt: Date;
    updatedAt: Date;
    resolved: boolean;
    metadata: Record<string, unknown>;
  }>
) {
  return {
    type: "thread" as const,
    id: "th_1",
    roomId: "room_1",
    createdAt: new Date(),
    updatedAt: new Date(),
    comments,
    metadata: {},
    resolved: false,
    ...overrides,
  };
}

describe("LiveblocksAdapter", () => {
  beforeEach(() => {
    mocks.mockVerifyRequest.mockReset();
    mocks.mockGetComment.mockReset();
    mocks.mockGetThread.mockReset();
    mocks.mockGetThreads.mockReset();
    mocks.mockCreateComment.mockReset();
    mocks.mockEditComment.mockReset();
    mocks.mockDeleteComment.mockReset();
    mocks.mockAddCommentReaction.mockReset();
    mocks.mockRemoveCommentReaction.mockReset();
    mocks.mockCreateThread.mockReset();
    mocks.mockGetRoom.mockReset();
    mocks.mockGetAttachment.mockReset();
  });

  describe("encodeThreadId / decodeThreadId", () => {
    test("encodes a thread ID correctly", () => {
      const adapter = createDummyAdapter();
      const encoded = adapter.encodeThreadId({
        roomId: "my-room",
        threadId: "th_abc123",
      });
      expect(encoded).toBe("liveblocks:my-room:th_abc123");
    });

    test("decodes a thread ID correctly", () => {
      const adapter = createDummyAdapter();
      const decoded = adapter.decodeThreadId("liveblocks:my-room:th_abc123");
      expect(decoded).toEqual({
        roomId: "my-room",
        threadId: "th_abc123",
      });
    });

    test("handles room IDs with colons", () => {
      const adapter = createDummyAdapter();
      const encoded = adapter.encodeThreadId({
        roomId: "org:team:project",
        threadId: "th_abc123",
      });
      expect(encoded).toBe("liveblocks:org:team:project:th_abc123");

      const decoded = adapter.decodeThreadId(encoded);
      expect(decoded).toEqual({
        roomId: "org:team:project",
        threadId: "th_abc123",
      });
    });

    test("roundtrip encoding/decoding preserves data", () => {
      const adapter = createDummyAdapter();
      const original = { roomId: "test-room", threadId: "th_test" };
      const encoded = adapter.encodeThreadId(original);
      const decoded = adapter.decodeThreadId(encoded);
      expect(decoded).toEqual(original);
    });

    test("throws for invalid thread ID format", () => {
      const adapter = createDummyAdapter();
      expect(() => adapter.decodeThreadId("invalid")).toThrow(
        "Invalid thread ID"
      );
    });

    test("throws for thread ID with wrong prefix", () => {
      const adapter = createDummyAdapter();
      expect(() => adapter.decodeThreadId("slack:room:thread")).toThrow(
        "Invalid thread ID"
      );
    });

    test("throws for thread ID with only two parts", () => {
      const adapter = createDummyAdapter();
      expect(() => adapter.decodeThreadId("liveblocks:room")).toThrow(
        "Invalid thread ID"
      );
    });
  });

  describe("channelIdFromThreadId", () => {
    test("extracts channel ID from thread ID", () => {
      const adapter = createDummyAdapter();
      const channelId = adapter.channelIdFromThreadId(
        "liveblocks:my-room:th_abc123"
      );
      expect(channelId).toBe("liveblocks:my-room");
    });

    test("handles room IDs with colons", () => {
      const adapter = createDummyAdapter();
      const channelId = adapter.channelIdFromThreadId(
        "liveblocks:org:team:project:th_abc123"
      );
      expect(channelId).toBe("liveblocks:org:team:project");
    });
  });

  describe("getRoomIdFromChannelId", () => {
    test("strips liveblocks: prefix for REST calls", () => {
      expect(getRoomIdFromChannelId("liveblocks:my-room")).toBe("my-room");
    });

    test("rejects bare room ids", () => {
      expect(() => getRoomIdFromChannelId("my-room")).toThrow(
        /Invalid channel ID: "my-room"/
      );
    });

    test("rejects empty room segment", () => {
      expect(() => getRoomIdFromChannelId("liveblocks:")).toThrow(
        /Invalid channel ID: "liveblocks:"/
      );
    });

    test("handles channel ids whose room id contains colons", () => {
      expect(getRoomIdFromChannelId("liveblocks:org:team:project")).toBe(
        "org:team:project"
      );
    });
  });

  describe("startTyping", () => {
    test("returns a resolved promise (no-op)", async () => {
      const adapter = createDummyAdapter();
      await expect(
        adapter.startTyping("liveblocks:room:thread")
      ).resolves.toBeUndefined();
    });

    test("accepts optional status parameter", async () => {
      const adapter = createDummyAdapter();
      await expect(
        adapter.startTyping("liveblocks:room:thread", "typing...")
      ).resolves.toBeUndefined();
    });
  });

  describe("handleWebhook", () => {
    test("returns 401 when verification fails", async () => {
      const adapter = createDummyAdapter();
      mocks.mockVerifyRequest.mockImplementation(() => {
        throw new Error("bad sig");
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(401);
      expect(await res.text()).toBe("Invalid webhook request");
    });

    test("returns 200 for non-commentCreated events without calling processMessage", async () => {
      const adapter = createDummyAdapter();
      const processMessage = vi.fn();
      await adapter.initialize({ processMessage } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "userEntered",
        data: {
          projectId: "p1",
          connectionId: 1,
          enteredAt: "2024-01-01T00:00:00.000Z",
          numActiveUsers: 1,
          roomId: "room_1",
          userId: "user_1",
          userInfo: null,
        },
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      expect(processMessage).not.toHaveBeenCalled();
      expect(mocks.mockGetComment).not.toHaveBeenCalled();
    });

    test("returns 200 for deleted comments without calling processMessage", async () => {
      const adapter = createDummyAdapter();
      const processMessage = vi.fn();
      await adapter.initialize({ processMessage } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentCreated",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          createdAt: "2024-01-01T00:00:00.000Z",
          createdBy: "user_1",
        },
      });

      mocks.mockGetComment.mockResolvedValue({
        type: "comment",
        id: "cm_1",
        threadId: "th_1",
        roomId: "room_1",
        userId: "user_1",
        createdAt: new Date(),
        reactions: [],
        attachments: [],
        metadata: {},
        deletedAt: new Date(),
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      expect(processMessage).not.toHaveBeenCalled();
    });

    test("calls processMessage for valid commentCreated", async () => {
      const adapter = createDummyAdapter();
      const processMessage = vi.fn();
      await adapter.initialize({ processMessage } as unknown as ChatInstance);

      const body: CommentBody = {
        version: 1,
        content: [
          {
            type: "paragraph",
            children: [{ text: "hi" }],
          },
        ],
      };

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentCreated",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          createdAt: "2024-01-01T00:00:00.000Z",
          createdBy: "user_1",
        },
      });

      mocks.mockGetComment.mockResolvedValue(createDummyComment({ body }));

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      expect(processMessage).toHaveBeenCalledTimes(1);
      const call = processMessage.mock.calls[0]!;
      expect(call[0]).toBe(adapter);
      expect(call[1]).toBe("liveblocks:room_1:th_1");
      expect(typeof call[2]).toBe("function");
    });

    test("calls processReaction with added: true for commentReactionAdded", async () => {
      const adapter = createDummyAdapter();
      const processReaction = vi.fn();
      await adapter.initialize({ processReaction } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentReactionAdded",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          emoji: "👍",
          addedAt: "2024-01-01T00:00:00.000Z",
          addedBy: "user_1",
        },
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      expect(processReaction).toHaveBeenCalledTimes(1);
      const call = processReaction.mock.calls[0]!;
      const event = call[0];
      expect(event.added).toBe(true);
      expect(event.rawEmoji).toBe("👍");
      expect(event.messageId).toBe("cm_1");
      expect(event.threadId).toBe("liveblocks:room_1:th_1");
      expect(event.user.userId).toBe("user_1");
      expect(event.user.userName).toBe("user_1");
      expect(event.user.isBot).toBe(false);
      expect(event.user.isMe).toBe(false);
      expect(event.adapter).toBe(adapter);
    });

    test("sets isBot and isMe to true when reaction is from bot user", async () => {
      const adapter = createDummyAdapter({ botUserId: "bot-user-id" });
      const processReaction = vi.fn();
      await adapter.initialize({ processReaction } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentReactionAdded",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          emoji: "👍",
          addedAt: "2024-01-01T00:00:00.000Z",
          addedBy: "bot-user-id",
        },
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      const event = processReaction.mock.calls[0]![0];
      expect(event.user.isBot).toBe(true);
      expect(event.user.isMe).toBe(true);
    });

    test("resolves user name via resolveUsers for reaction events", async () => {
      const resolveUsers = vi.fn().mockResolvedValue([{ name: "Alice Smith" }]);
      const adapter = createDummyAdapter({ resolveUsers });
      const processReaction = vi.fn();
      await adapter.initialize({ processReaction } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentReactionAdded",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          emoji: "👍",
          addedAt: "2024-01-01T00:00:00.000Z",
          addedBy: "user_alice",
        },
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      expect(resolveUsers).toHaveBeenCalledWith({ userIds: ["user_alice"] });
      const event = processReaction.mock.calls[0]![0];
      expect(event.user.userId).toBe("user_alice");
      expect(event.user.userName).toBe("Alice Smith");
      expect(event.user.fullName).toBe("Alice Smith");
    });

    test("calls processReaction with added: false for commentReactionRemoved", async () => {
      const adapter = createDummyAdapter();
      const processReaction = vi.fn();
      await adapter.initialize({ processReaction } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentReactionRemoved",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          emoji: "❤️",
          removedAt: "2024-01-01T00:00:00.000Z",
          removedBy: "user_2",
        },
      });

      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        })
      );
      expect(res.status).toBe(200);
      expect(processReaction).toHaveBeenCalledTimes(1);
      const call = processReaction.mock.calls[0]!;
      const event = call[0];
      expect(event.added).toBe(false);
      expect(event.rawEmoji).toBe("❤️");
      expect(event.messageId).toBe("cm_1");
      expect(event.threadId).toBe("liveblocks:room_1:th_1");
      expect(event.user.userId).toBe("user_2");
      expect(event.user.userName).toBe("user_2");
      expect(event.adapter).toBe(adapter);
    });

    test("passes options to processReaction for reaction events", async () => {
      const adapter = createDummyAdapter();
      const processReaction = vi.fn();
      await adapter.initialize({ processReaction } as unknown as ChatInstance);

      mocks.mockVerifyRequest.mockReturnValue({
        type: "commentReactionAdded",
        data: {
          projectId: "p1",
          roomId: "room_1",
          threadId: "th_1",
          commentId: "cm_1",
          emoji: "🎉",
          addedAt: "2024-01-01T00:00:00.000Z",
          addedBy: "user_1",
        },
      });

      const waitUntil = vi.fn();
      const res = await adapter.handleWebhook(
        new Request("https://example.com/webhook", {
          method: "POST",
          body: "{}",
        }),
        { waitUntil }
      );
      expect(res.status).toBe(200);
      expect(processReaction).toHaveBeenCalledTimes(1);
      const call = processReaction.mock.calls[0]!;
      expect(call[1]).toEqual({ waitUntil });
    });
  });

  describe("fetchMessages (comment to Message conversion)", () => {
    test("maps plain text comment to message text and formatted AST", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            id: "c1",
            userId: "alice",
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [{ text: "Hello world" }],
                },
              ],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages).toHaveLength(1);
      expect(messages[0]!.text).toBe("Hello world");
      expect(messages[0]!.formatted).toEqual({
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "Hello world" }],
          },
        ],
      });
      expect(messages[0]!.author.userId).toBe("alice");
      expect(messages[0]!.author.userName).toBe("alice");
      expect(messages[0]!.metadata.dateSent).toEqual(
        new Date("2024-01-01T00:00:00.000Z")
      );
      expect(messages[0]!.metadata.edited).toBe(false);
    });

    test("resolves user mentions via resolveUsers", async () => {
      const adapter = createDummyAdapter({
        resolveUsers: async ({ userIds }: ResolveUsersArgs) =>
          userIds.map((id: string) =>
            id === "user-1" ? { name: "Alice" } : undefined
          ),
      });
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [{ type: "mention", kind: "user", id: "user-1" }],
                },
              ],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages[0]!.text).toBe("Alice");
      expect(messages[0]!.formatted).toEqual({
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "Alice" }],
          },
        ],
      });
    });

    test("resolves group mentions via resolveGroupsInfo", async () => {
      const adapter = createDummyAdapter({
        resolveGroupsInfo: async ({ groupIds }: ResolveGroupsInfoArgs) =>
          groupIds.map((id: string) =>
            id === "group-1" ? { name: "Engineering" } : undefined
          ),
      });
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [{ type: "mention", kind: "group", id: "group-1" }],
                },
              ],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages[0]!.text).toBe("Engineering");
    });

    test("maps links to formatted link nodes and plain text", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [
                    {
                      type: "link",
                      url: "https://example.com",
                      text: "click",
                    },
                  ],
                },
              ],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages[0]!.text).toBe("click");
      expect(messages[0]!.links).toEqual([{ url: "https://example.com" }]);
      expect(messages[0]!.formatted).toEqual({
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "link",
                url: "https://example.com",
                children: [{ type: "text", value: "click" }],
              },
            ],
          },
        ],
      });
    });

    test("maps bold, italic, code, and strikethrough text", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [
                    { text: "b", bold: true },
                    { text: "i", italic: true },
                    { text: "s", strikethrough: true },
                    { text: "c", code: true },
                  ],
                },
              ],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages[0]!.text).toBe("bisc");
      expect(messages[0]!.formatted).toEqual({
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [
              {
                type: "strong",
                children: [{ type: "text", value: "b" }],
              },
              {
                type: "emphasis",
                children: [{ type: "text", value: "i" }],
              },
              {
                type: "delete",
                children: [{ type: "text", value: "s" }],
              },
              {
                type: "inlineCode",
                value: "c",
              },
            ],
          },
        ],
      });
    });

    test("sets isMention when the bot user is mentioned", async () => {
      const botUserId = "bot-user-id";
      const adapter = createDummyAdapter({
        botUserId,
        resolveUsers: async ({ userIds }: ResolveUsersArgs) =>
          userIds.map((id: string) =>
            id === botUserId ? { name: "Botty" } : undefined
          ),
      });
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [{ type: "mention", kind: "user", id: botUserId }],
                },
              ],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages[0]!.isMention).toBe(true);
    });

    test("filters out deleted comments", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            id: "c1",
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [{ text: "visible" }],
                },
              ],
            },
          }),
          {
            type: "comment",
            id: "c2",
            threadId: "th_1",
            roomId: "room_1",
            userId: "user_1",
            createdAt: new Date(),
            reactions: [],
            attachments: [],
            metadata: {},
            deletedAt: new Date(),
          },
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      expect(messages).toHaveLength(1);
      expect(messages[0]!.text).toBe("visible");
    });

    test("derives attachment types from mime types", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            attachments: [
              {
                type: "attachment",
                id: "a1",
                name: "p.png",
                mimeType: "image/png",
                size: 10,
              },
              {
                type: "attachment",
                id: "a2",
                name: "v.mp4",
                mimeType: "video/mp4",
                size: 10,
              },
              {
                type: "attachment",
                id: "a3",
                name: "s.mp3",
                mimeType: "audio/mpeg",
                size: 10,
              },
              {
                type: "attachment",
                id: "a4",
                name: "f.pdf",
                mimeType: "application/pdf",
                size: 10,
              },
            ],
            body: {
              version: 1,
              content: [{ type: "paragraph", children: [{ text: "x" }] }],
            },
          }),
        ])
      );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      const atts = messages[0]!.attachments;
      expect(atts.map((a) => a.type)).toEqual([
        "image",
        "video",
        "audio",
        "file",
      ]);
    });

    describe("pagination", () => {
      function createDummyComments(count: number) {
        return Array.from({ length: count }, (_, i) =>
          createDummyComment({
            id: `c${i}`,
            createdAt: new Date(1000 * i),
            body: {
              version: 1,
              content: [
                {
                  type: "paragraph",
                  children: [{ text: `msg-${i}` }],
                },
              ],
            },
          })
        );
      }

      function decodeCursor(cursor: string): { id: string; createdAt: number } {
        let s = cursor.replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        const parsed = JSON.parse(atob(s));
        return { id: parsed[0][1], createdAt: parsed[1][1] };
      }

      test("returns all messages when no options are provided", async () => {
        const adapter = createDummyAdapter();
        const comments = createDummyComments(60);
        mocks.mockGetThread.mockResolvedValue(createDummyThread(comments));

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1");
        expect(result.messages).toHaveLength(60);
        expect(result.messages[0]!.text).toBe("msg-0");
        expect(result.messages[59]!.text).toBe("msg-59");
        expect(result.nextCursor).toBeUndefined();
      });

      test("backward: respects limit and returns the newest page", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(10))
        );

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          limit: 3,
        });
        expect(result.messages).toHaveLength(3);
        expect(result.messages[0]!.text).toBe("msg-7");
        expect(result.messages[2]!.text).toBe("msg-9");
      });

      test("backward: returns all messages when limit >= total", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(3))
        );

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          limit: 100,
        });
        expect(result.messages).toHaveLength(3);
        expect(result.nextCursor).toBeUndefined();
      });

      test("backward: paginates through all messages using cursors", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(5))
        );

        const page1 = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          limit: 3,
        });
        expect(page1.messages.map((m) => m.text)).toEqual([
          "msg-2",
          "msg-3",
          "msg-4",
        ]);
        expect(page1.nextCursor).toBeDefined();
        expect(decodeCursor(page1.nextCursor!)).toEqual({
          id: "c2",
          createdAt: 2000,
        });

        const page2 = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          limit: 3,
          cursor: page1.nextCursor,
        });
        expect(page2.messages.map((m) => m.text)).toEqual(["msg-0", "msg-1"]);
        expect(page2.nextCursor).toBeUndefined();
      });

      test("forward: returns oldest messages first", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(5))
        );

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          direction: "forward",
          limit: 3,
        });
        expect(result.messages.map((m) => m.text)).toEqual([
          "msg-0",
          "msg-1",
          "msg-2",
        ]);
        expect(result.nextCursor).toBeDefined();
        expect(decodeCursor(result.nextCursor!)).toEqual({
          id: "c2",
          createdAt: 2000,
        });
      });

      test("forward: paginates through all messages using cursors", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(5))
        );

        const page1 = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          direction: "forward",
          limit: 2,
        });
        expect(page1.messages.map((m) => m.text)).toEqual(["msg-0", "msg-1"]);
        expect(decodeCursor(page1.nextCursor!)).toEqual({
          id: "c1",
          createdAt: 1000,
        });

        const page2 = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          direction: "forward",
          limit: 2,
          cursor: page1.nextCursor,
        });
        expect(page2.messages.map((m) => m.text)).toEqual(["msg-2", "msg-3"]);
        expect(decodeCursor(page2.nextCursor!)).toEqual({
          id: "c3",
          createdAt: 3000,
        });

        const page3 = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          direction: "forward",
          limit: 2,
          cursor: page2.nextCursor,
        });
        expect(page3.messages.map((m) => m.text)).toEqual(["msg-4"]);
        expect(page3.nextCursor).toBeUndefined();
      });

      test("cursor is base64url-encoded JSON matching backend format", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(5))
        );

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          direction: "forward",
          limit: 2,
        });
        const decoded = decodeCursor(result.nextCursor!);
        expect(decoded).toEqual({ id: "c1", createdAt: 1000 });
        expect(result.nextCursor).not.toContain("+");
        expect(result.nextCursor).not.toContain("/");
        expect(result.nextCursor).not.toContain("=");
      });

      test("returns empty result for invalid cursor", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(
          createDummyThread(createDummyComments(3))
        );

        await expect(
          adapter.fetchMessages("liveblocks:room_1:th_1", {
            cursor: "not_a_valid_cursor",
            limit: 10,
          })
        ).rejects.toThrow("Invalid pagination cursor");
      });

      test("empty thread returns no messages and no cursor", async () => {
        const adapter = createDummyAdapter();
        mocks.mockGetThread.mockResolvedValue(createDummyThread([]));

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          limit: 10,
        });
        expect(result.messages).toHaveLength(0);
        expect(result.nextCursor).toBeUndefined();
      });

      test("deleted comments are excluded before pagination", async () => {
        const adapter = createDummyAdapter();
        const comments: CommentData[] = [
          createDummyComment({
            id: "c0",
            createdAt: new Date(1000),
            body: {
              version: 1,
              content: [
                { type: "paragraph", children: [{ text: "visible-0" }] },
              ],
            },
          }),
          {
            type: "comment",
            id: "c1",
            threadId: "th_1",
            roomId: "room_1",
            userId: "user_1",
            createdAt: new Date(2000),
            reactions: [],
            attachments: [],
            metadata: {},
            deletedAt: new Date(),
          },
          createDummyComment({
            id: "c2",
            createdAt: new Date(3000),
            body: {
              version: 1,
              content: [
                { type: "paragraph", children: [{ text: "visible-1" }] },
              ],
            },
          }),
        ];
        mocks.mockGetThread.mockResolvedValue(createDummyThread(comments));

        const result = await adapter.fetchMessages("liveblocks:room_1:th_1", {
          direction: "forward",
          limit: 10,
        });
        expect(result.messages).toHaveLength(2);
        expect(result.messages.map((m) => m.text)).toEqual([
          "visible-0",
          "visible-1",
        ]);
      });
    });
  });

  describe("listThreads", () => {
    test("returns thread summaries with root message, replyCount, and lastReplyAt", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              createDummyComment({
                id: "c1",
                threadId: "th_a",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [
                    {
                      type: "paragraph",
                      children: [{ text: "root a" }],
                    },
                  ],
                },
              }),
              createDummyComment({
                id: "c2",
                threadId: "th_a",
                roomId: "room_1",
                createdAt: new Date("2024-01-02T00:00:00.000Z"),
                body: {
                  version: 1,
                  content: [
                    {
                      type: "paragraph",
                      children: [{ text: "reply" }],
                    },
                  ],
                },
              }),
            ],
            {
              id: "th_a",
              updatedAt: new Date("2024-06-01T00:00:00.000Z"),
            }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "c3",
                threadId: "th_b",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [
                    {
                      type: "paragraph",
                      children: [{ text: "root b" }],
                    },
                  ],
                },
              }),
            ],
            {
              id: "th_b",
              updatedAt: new Date("2024-06-02T00:00:00.000Z"),
            }
          ),
        ],
      });

      const result = await adapter.listThreads("liveblocks:room_1");
      expect(result.threads).toHaveLength(2);
      expect(result.nextCursor).toBeUndefined();

      expect(result.threads[0]!.id).toBe("liveblocks:room_1:th_a");
      expect(result.threads[0]!.replyCount).toBe(1);
      expect(result.threads[0]!.lastReplyAt).toEqual(
        new Date("2024-06-01T00:00:00.000Z")
      );
      expect(result.threads[0]!.rootMessage.text).toBe("root a");

      expect(result.threads[1]!.id).toBe("liveblocks:room_1:th_b");
      expect(result.threads[1]!.replyCount).toBe(0);
      expect(result.threads[1]!.rootMessage.text).toBe("root b");

      expect(mocks.mockGetThreads).toHaveBeenCalledWith({ roomId: "room_1" });
    });

    test("passes bare room id to getThreads when channel id is prefixed", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({ data: [] });

      await adapter.listThreads("liveblocks:room_1");

      expect(mocks.mockGetThreads).toHaveBeenCalledWith({
        roomId: "room_1",
      });
    });

    test("skips threads where all comments are deleted or lack a body", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              {
                type: "comment",
                id: "c_del",
                threadId: "th_dead",
                roomId: "room_1",
                userId: "u1",
                createdAt: new Date(),
                reactions: [],
                attachments: [],
                metadata: {},
                deletedAt: new Date(),
              },
            ],
            { id: "th_dead" }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "c_ok",
                threadId: "th_ok",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [
                    { type: "paragraph", children: [{ text: "still here" }] },
                  ],
                },
              }),
            ],
            { id: "th_ok" }
          ),
        ],
      });

      const result = await adapter.listThreads("liveblocks:room_1");
      expect(result.threads).toHaveLength(1);
      expect(result.threads[0]!.id).toBe("liveblocks:room_1:th_ok");
      expect(result.threads[0]!.rootMessage.text).toBe("still here");
    });

    test("supports limit-based pagination (newest threads first)", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              createDummyComment({
                id: "r1",
                threadId: "th_1",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t1" }] }],
                },
              }),
            ],
            { id: "th_1", updatedAt: new Date(1000) }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "r2",
                threadId: "th_2",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t2" }] }],
                },
              }),
            ],
            { id: "th_2", updatedAt: new Date(2000) }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "r3",
                threadId: "th_3",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t3" }] }],
                },
              }),
            ],
            { id: "th_3", updatedAt: new Date(3000) }
          ),
        ],
      });

      const page = await adapter.listThreads("liveblocks:room_1", { limit: 2 });
      expect(page.threads.map((t) => t.id)).toEqual([
        "liveblocks:room_1:th_2",
        "liveblocks:room_1:th_3",
      ]);
      expect(page.nextCursor).toBeDefined();
      expect(page.nextCursor).not.toContain("+");
      expect(page.nextCursor).not.toContain("/");
      expect(page.nextCursor).not.toContain("=");
    });

    test("paginates through threads using cursor", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              createDummyComment({
                id: "r1",
                threadId: "th_1",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t1" }] }],
                },
              }),
            ],
            { id: "th_1", updatedAt: new Date(1000) }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "r2",
                threadId: "th_2",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t2" }] }],
                },
              }),
            ],
            { id: "th_2", updatedAt: new Date(2000) }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "r3",
                threadId: "th_3",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t3" }] }],
                },
              }),
            ],
            { id: "th_3", updatedAt: new Date(3000) }
          ),
        ],
      });

      const page1 = await adapter.listThreads("liveblocks:room_1", {
        limit: 2,
      });
      const page2 = await adapter.listThreads("liveblocks:room_1", {
        limit: 2,
        cursor: page1.nextCursor,
      });
      expect(page1.threads.map((t) => t.id)).toEqual([
        "liveblocks:room_1:th_2",
        "liveblocks:room_1:th_3",
      ]);
      expect(page2.threads.map((t) => t.id)).toEqual([
        "liveblocks:room_1:th_1",
      ]);
      expect(page2.nextCursor).toBeUndefined();
    });

    test("returns empty threads when room has no threads", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({ data: [] });
      const result = await adapter.listThreads("liveblocks:room_1");
      expect(result.threads).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });

    test("rejects invalid pagination cursor", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              createDummyComment({
                id: "r1",
                threadId: "th_1",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [{ type: "paragraph", children: [{ text: "t1" }] }],
                },
              }),
            ],
            { id: "th_1", updatedAt: new Date(1000) }
          ),
        ],
      });
      await expect(
        adapter.listThreads("liveblocks:room_1", {
          limit: 2,
          cursor: "not_a_valid_cursor",
        })
      ).rejects.toThrow("Invalid pagination cursor");
    });
  });

  describe("fetchChannelMessages", () => {
    test("returns root comments from all threads in chronological order", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              createDummyComment({
                id: "root_b",
                threadId: "th_b",
                roomId: "room_1",
                createdAt: new Date("2024-01-02T00:00:00.000Z"),
                body: {
                  version: 1,
                  content: [
                    { type: "paragraph", children: [{ text: "second" }] },
                  ],
                },
              }),
            ],
            { id: "th_b" }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "root_a",
                threadId: "th_a",
                roomId: "room_1",
                createdAt: new Date("2024-01-01T00:00:00.000Z"),
                body: {
                  version: 1,
                  content: [
                    { type: "paragraph", children: [{ text: "first" }] },
                  ],
                },
              }),
            ],
            { id: "th_a" }
          ),
        ],
      });

      const { messages } =
        await adapter.fetchChannelMessages("liveblocks:room_1");
      expect(messages.map((m) => m.text)).toEqual(["first", "second"]);
      expect(mocks.mockGetThreads).toHaveBeenCalledWith({ roomId: "room_1" });
    });

    test("passes bare room id to getThreads when channel id is prefixed", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({ data: [] });

      await adapter.fetchChannelMessages("liveblocks:room_1");

      expect(mocks.mockGetThreads).toHaveBeenCalledWith({
        roomId: "room_1",
      });
    });

    test("omits threads whose only comments are deleted", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({
        data: [
          createDummyThread(
            [
              {
                type: "comment",
                id: "gone",
                threadId: "th_x",
                roomId: "room_1",
                userId: "u1",
                createdAt: new Date(),
                reactions: [],
                attachments: [],
                metadata: {},
                deletedAt: new Date(),
              },
            ],
            { id: "th_x" }
          ),
          createDummyThread(
            [
              createDummyComment({
                id: "ok",
                threadId: "th_y",
                roomId: "room_1",
                body: {
                  version: 1,
                  content: [
                    { type: "paragraph", children: [{ text: "keep" }] },
                  ],
                },
              }),
            ],
            { id: "th_y" }
          ),
        ],
      });

      const { messages } =
        await adapter.fetchChannelMessages("liveblocks:room_1");
      expect(messages).toHaveLength(1);
      expect(messages[0]!.text).toBe("keep");
    });

    test("backward: respects limit and returns newest root messages first", async () => {
      const adapter = createDummyAdapter();
      const threads = [1, 2, 3, 4, 5].map((i) =>
        createDummyThread(
          [
            createDummyComment({
              id: `root_${i}`,
              threadId: `th_${i}`,
              roomId: "room_1",
              createdAt: new Date(1000 * i),
              body: {
                version: 1,
                content: [
                  { type: "paragraph", children: [{ text: `msg-${i}` }] },
                ],
              },
            }),
          ],
          { id: `th_${i}` }
        )
      );
      mocks.mockGetThreads.mockResolvedValue({ data: threads });

      const result = await adapter.fetchChannelMessages("liveblocks:room_1", {
        limit: 2,
      });
      expect(result.messages.map((m) => m.text)).toEqual(["msg-4", "msg-5"]);
      expect(result.nextCursor).toBeDefined();
    });

    test("forward: paginates root messages using cursor", async () => {
      const adapter = createDummyAdapter();
      const threads = [0, 1, 2, 3, 4].map((i) =>
        createDummyThread(
          [
            createDummyComment({
              id: `root_${i}`,
              threadId: `th_${i}`,
              roomId: "room_1",
              createdAt: new Date(1000 * i),
              body: {
                version: 1,
                content: [
                  { type: "paragraph", children: [{ text: `msg-${i}` }] },
                ],
              },
            }),
          ],
          { id: `th_${i}` }
        )
      );
      mocks.mockGetThreads.mockResolvedValue({ data: threads });

      const page1 = await adapter.fetchChannelMessages("liveblocks:room_1", {
        direction: "forward",
        limit: 2,
      });
      expect(page1.messages.map((m) => m.text)).toEqual(["msg-0", "msg-1"]);

      const page2 = await adapter.fetchChannelMessages("liveblocks:room_1", {
        direction: "forward",
        limit: 2,
        cursor: page1.nextCursor,
      });
      expect(page2.messages.map((m) => m.text)).toEqual(["msg-2", "msg-3"]);
    });

    test("returns no messages when room has no threads", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThreads.mockResolvedValue({ data: [] });
      const result = await adapter.fetchChannelMessages("liveblocks:room_1");
      expect(result.messages).toEqual([]);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe("parseMessage", () => {
    test("returns message with ids, bot flags, metadata, empty formatted", () => {
      const adapter = createDummyAdapter({ botUserId: "bot-1" });
      const msg = adapter.parseMessage(
        createDummyComment({
          id: "cm_x",
          userId: "bot-1",
          editedAt: new Date("2024-02-01T00:00:00.000Z"),
          body: {
            version: 1,
            content: [
              { type: "paragraph", children: [{ text: "ignored in parse" }] },
            ],
          },
        })
      );
      expect(msg.id).toBe("cm_x");
      expect(msg.threadId).toBe("liveblocks:room_1:th_1");
      expect(msg.author.isBot).toBe(true);
      expect(msg.author.isMe).toBe(true);
      expect(msg.metadata.edited).toBe(true);
      expect(msg.formatted).toEqual({ type: "root", children: [] });
      expect(msg.text).toBe("");
    });

    test("sets isBot and isMe to false for non-bot user", () => {
      const adapter = createDummyAdapter({ botUserId: "bot-1" });
      const msg = adapter.parseMessage(
        createDummyComment({
          id: "cm_y",
          userId: "human-user",
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "hello" }] }],
          },
        })
      );
      expect(msg.author.isBot).toBe(false);
      expect(msg.author.isMe).toBe(false);
      expect(msg.author.userId).toBe("human-user");
    });

    test("maps attachments correctly", () => {
      const adapter = createDummyAdapter();
      const msg = adapter.parseMessage(
        createDummyComment({
          attachments: [
            {
              type: "attachment",
              id: "att_1",
              name: "photo.jpg",
              mimeType: "image/jpeg",
              size: 5000,
            },
          ],
          body: {
            version: 1,
            content: [
              { type: "paragraph", children: [{ text: "see attachment" }] },
            ],
          },
        })
      );
      expect(msg.attachments).toHaveLength(1);
      expect(msg.attachments[0]!.type).toBe("image");
      expect(msg.attachments[0]!.name).toBe("photo.jpg");
      expect(msg.attachments[0]!.mimeType).toBe("image/jpeg");
      expect(msg.attachments[0]!.size).toBe(5000);
    });
  });

  describe("postMessage", () => {
    test("calls createComment with correct args and returns RawMessage", async () => {
      const adapter = createDummyAdapter();
      const returnedComment = createDummyComment({
        id: "cm_new",
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Hello" }] }],
        },
      });
      mocks.mockCreateComment.mockResolvedValue(returnedComment);

      const result = await adapter.postMessage(
        "liveblocks:room_1:th_1",
        "Hello"
      );

      expect(mocks.mockCreateComment).toHaveBeenCalledWith({
        roomId: "room_1",
        threadId: "th_1",
        data: {
          userId: "bot-user-id",
          body: expect.objectContaining({ version: 1 }),
        },
      });
      expect(result.id).toBe("cm_new");
      expect(result.threadId).toBe("liveblocks:room_1:th_1");
      expect(result.raw).toBe(returnedComment);
    });
  });

  describe("editMessage", () => {
    test("calls editComment with correct args and returns RawMessage", async () => {
      const adapter = createDummyAdapter();
      const returnedComment = createDummyComment({
        id: "cm_edited",
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "Updated" }] }],
        },
      });
      mocks.mockEditComment.mockResolvedValue(returnedComment);

      const result = await adapter.editMessage(
        "liveblocks:room_1:th_1",
        "cm_edited",
        "Updated"
      );

      expect(mocks.mockEditComment).toHaveBeenCalledWith({
        roomId: "room_1",
        threadId: "th_1",
        commentId: "cm_edited",
        data: {
          body: expect.objectContaining({ version: 1 }),
        },
      });
      expect(result.id).toBe("cm_edited");
      expect(result.threadId).toBe("liveblocks:room_1:th_1");
      expect(result.raw).toBe(returnedComment);
    });
  });

  describe("deleteMessage", () => {
    test("calls deleteComment with correct args", async () => {
      const adapter = createDummyAdapter();
      mocks.mockDeleteComment.mockResolvedValue(undefined);

      await adapter.deleteMessage("liveblocks:room_1:th_1", "cm_del");

      expect(mocks.mockDeleteComment).toHaveBeenCalledWith({
        roomId: "room_1",
        threadId: "th_1",
        commentId: "cm_del",
      });
    });
  });

  describe("addReaction", () => {
    test("calls addCommentReaction with correct args", async () => {
      const adapter = createDummyAdapter();
      mocks.mockAddCommentReaction.mockResolvedValue(undefined);

      await adapter.addReaction("liveblocks:room_1:th_1", "cm_1", "👍");

      expect(mocks.mockAddCommentReaction).toHaveBeenCalledWith({
        roomId: "room_1",
        threadId: "th_1",
        commentId: "cm_1",
        data: {
          emoji: expect.any(String),
          userId: "bot-user-id",
        },
      });
    });
  });

  describe("removeReaction", () => {
    test("calls removeCommentReaction with correct args", async () => {
      const adapter = createDummyAdapter();
      mocks.mockRemoveCommentReaction.mockResolvedValue(undefined);

      await adapter.removeReaction("liveblocks:room_1:th_1", "cm_1", "👍");

      expect(mocks.mockRemoveCommentReaction).toHaveBeenCalledWith({
        roomId: "room_1",
        threadId: "th_1",
        commentId: "cm_1",
        data: {
          emoji: expect.any(String),
          userId: "bot-user-id",
        },
      });
    });
  });

  describe("fetchThread", () => {
    test("returns ThreadInfo with metadata and resolved status", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([], {
          id: "th_abc",
          roomId: "room_1",
          resolved: true,
          metadata: { priority: "high" },
        })
      );

      const info = await adapter.fetchThread("liveblocks:room_1:th_abc");
      expect(info).toEqual({
        id: "liveblocks:room_1:th_abc",
        channelId: "liveblocks:room_1",
        metadata: {
          resolved: true,
          priority: "high",
        },
        channelName: "room_1",
        isDM: false,
      });
    });

    test("returns unresolved thread with empty metadata", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([], {
          id: "th_xyz",
          roomId: "room_1",
        })
      );

      const info = await adapter.fetchThread("liveblocks:room_1:th_xyz");
      expect(info.metadata.resolved).toBe(false);
      expect(info.isDM).toBe(false);
    });
  });

  describe("fetchMessage", () => {
    test("returns a message for a valid comment", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetComment.mockResolvedValue(
        createDummyComment({
          id: "cm_found",
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "found it" }] }],
          },
        })
      );

      const msg = await adapter.fetchMessage(
        "liveblocks:room_1:th_1",
        "cm_found"
      );
      expect(msg).not.toBeNull();
      expect(msg!.id).toBe("cm_found");
      expect(msg!.text).toBe("found it");
    });

    test("returns null for a deleted comment", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetComment.mockResolvedValue({
        type: "comment",
        id: "cm_del",
        threadId: "th_1",
        roomId: "room_1",
        userId: "user_1",
        createdAt: new Date(),
        reactions: [],
        attachments: [],
        metadata: {},
        deletedAt: new Date(),
      });

      const msg = await adapter.fetchMessage(
        "liveblocks:room_1:th_1",
        "cm_del"
      );
      expect(msg).toBeNull();
    });

    test("returns null when LiveblocksError with status 404 is thrown", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetComment.mockRejectedValue(
        new mocks.MockLiveblocksError("Not found", 404)
      );

      const msg = await adapter.fetchMessage(
        "liveblocks:room_1:th_1",
        "cm_missing"
      );
      expect(msg).toBeNull();
    });

    test("rethrows non-404 LiveblocksError", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetComment.mockRejectedValue(
        new mocks.MockLiveblocksError("Forbidden", 403)
      );

      await expect(
        adapter.fetchMessage("liveblocks:room_1:th_1", "cm_forbidden")
      ).rejects.toThrow("Forbidden");
    });

    test("rethrows non-LiveblocksError errors", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetComment.mockRejectedValue(new Error("Network failure"));

      await expect(
        adapter.fetchMessage("liveblocks:room_1:th_1", "cm_err")
      ).rejects.toThrow("Network failure");
    });
  });

  describe("fetchChannelInfo", () => {
    test("returns ChannelInfo and resolves Chat channel id for getRoom", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetRoom.mockResolvedValue({
        id: "my-room",
        type: "room",
      });

      const info = await adapter.fetchChannelInfo("liveblocks:my-room");
      expect(info).toEqual({
        id: "my-room",
        name: "my-room",
        isDM: false,
        metadata: {},
      });

      expect(mocks.mockGetRoom).toHaveBeenCalledWith("my-room");
    });
  });

  describe("postChannelMessage", () => {
    test("creates a thread and returns the first comment as RawMessage", async () => {
      const adapter = createDummyAdapter();
      const comment = createDummyComment({
        id: "cm_root",
        threadId: "th_new",
        roomId: "channel_1",
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
      });
      mocks.mockCreateThread.mockResolvedValue({
        type: "thread",
        id: "th_new",
        roomId: "channel_1",
        comments: [comment],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
      });

      const result = await adapter.postChannelMessage(
        "liveblocks:channel_1",
        "hi"
      );

      expect(mocks.mockCreateThread).toHaveBeenCalledWith({
        roomId: "channel_1",
        data: {
          comment: {
            userId: "bot-user-id",
            body: expect.objectContaining({ version: 1 }),
          },
        },
      });
      expect(result.id).toBe("cm_root");
      expect(result.threadId).toBe("liveblocks:channel_1:th_new");
      expect(result.raw).toBe(comment);
    });

    test("throws when thread has no comments", async () => {
      const adapter = createDummyAdapter();
      mocks.mockCreateThread.mockResolvedValue({
        type: "thread",
        id: "th_empty",
        roomId: "channel_1",
        comments: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
      });

      await expect(
        adapter.postChannelMessage("liveblocks:channel_1", "hello")
      ).rejects.toThrow("Failed to create thread in room liveblocks:channel_1");
    });
  });

  describe("renderFormatted", () => {
    test("converts formatted content to plain text", () => {
      const adapter = createDummyAdapter();
      const result = adapter.renderFormatted({
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "Hello world" }],
          },
        ],
      } as any);
      expect(result).toContain("Hello world");
    });

    test("handles multiple paragraphs", () => {
      const adapter = createDummyAdapter();
      const result = adapter.renderFormatted({
        type: "root",
        children: [
          {
            type: "paragraph",
            children: [{ type: "text", value: "Line 1" }],
          },
          {
            type: "paragraph",
            children: [{ type: "text", value: "Line 2" }],
          },
        ],
      } as any);
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 2");
    });
  });

  describe("attachment fetchData", () => {
    test("fetches data from the attachment URL", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            attachments: [
              {
                type: "attachment",
                id: "att_1",
                name: "test.txt",
                mimeType: "text/plain",
                size: 11,
              },
            ],
            body: {
              version: 1,
              content: [{ type: "paragraph", children: [{ text: "x" }] }],
            },
          }),
        ])
      );

      mocks.mockGetAttachment.mockResolvedValue({
        url: "https://storage.example.com/att_1",
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(new Response("hello world", { status: 200 }));

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      const data = await messages[0]!.attachments[0]!.fetchData!();

      expect(mocks.mockGetAttachment).toHaveBeenCalledWith({
        roomId: "room_1",
        attachmentId: "att_1",
      });
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://storage.example.com/att_1"
      );
      expect(data).toBeInstanceOf(Buffer);
      expect(data.toString()).toBe("hello world");

      fetchSpy.mockRestore();
    });

    test("throws on non-OK response", async () => {
      const adapter = createDummyAdapter();
      mocks.mockGetThread.mockResolvedValue(
        createDummyThread([
          createDummyComment({
            attachments: [
              {
                type: "attachment",
                id: "att_2",
                name: "missing.txt",
                mimeType: "text/plain",
                size: 0,
              },
            ],
            body: {
              version: 1,
              content: [{ type: "paragraph", children: [{ text: "x" }] }],
            },
          }),
        ])
      );

      mocks.mockGetAttachment.mockResolvedValue({
        url: "https://storage.example.com/att_2",
      });

      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValue(
          new Response(null, { status: 404, statusText: "Not Found" })
        );

      const { messages } = await adapter.fetchMessages(
        "liveblocks:room_1:th_1"
      );
      await expect(messages[0]!.attachments[0]!.fetchData!()).rejects.toThrow(
        'Failed to fetch attachment "missing.txt": 404 Not Found'
      );

      fetchSpy.mockRestore();
    });
  });
});

describe("convertPostableMessageToCommentBody", () => {
  test("converts string input to a single paragraph of text", () => {
    const body = convertPostableMessageToCommentBody("Hello world");
    expect(body).toEqual({
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ text: "Hello world" }],
        },
      ],
    });
  });

  test("converts { raw: string } like plain string", () => {
    const body = convertPostableMessageToCommentBody({ raw: "Hello world" });
    expect(body.content[0]).toEqual({
      type: "paragraph",
      children: [{ text: "Hello world" }],
    });
  });

  test("converts markdown with bold and italic", () => {
    const body = convertPostableMessageToCommentBody({
      markdown: "**bold** and *italic*",
    });
    expect(body.version).toBe(1);
    expect(body.content).toHaveLength(1);
    const para = body.content[0]!;
    expect(para.type).toBe("paragraph");
    expect(para.children).toEqual([
      { text: "bold", bold: true },
      { text: " and " },
      { text: "italic", italic: true },
    ]);
  });

  test("converts { ast: Root } without reparsing markdown", () => {
    const ast: Root = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "direct" }],
        },
      ],
    };
    const body = convertPostableMessageToCommentBody({ ast });
    expect(body).toEqual({
      version: 1,
      content: [
        {
          type: "paragraph",
          children: [{ text: "direct" }],
        },
      ],
    });
  });

  test("converts { card: CardElement } via markdown fallback", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        title: "Title",
        subtitle: "Subtitle",
        children: [{ type: "text", content: "Line" }],
      },
    });
    expect(body.version).toBe(1);
    expect(body.content.length).toBeGreaterThan(0);
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Title");
    expect(textJoined).toContain("Subtitle");
    expect(textJoined).toContain("Line");
  });

  test("converts inline code", () => {
    const body = convertPostableMessageToCommentBody("`code`");
    const para = body.content[0]!;
    expect(para.children).toContainEqual({
      text: "code",
      code: true,
    });
  });

  test("converts markdown links", () => {
    const body = convertPostableMessageToCommentBody(
      "[click](https://example.com)"
    );
    expect(body.content[0]!.children[0]).toEqual({
      type: "link",
      url: "https://example.com",
      text: "click",
    });
  });

  test("converts strikethrough (GFM)", () => {
    const body = convertPostableMessageToCommentBody("~~deleted~~");
    expect(body.content[0]!.children[0]).toMatchObject({
      text: "deleted",
      strikethrough: true,
    });
  });

  test("flattens headings and code blocks into paragraph-compatible content", () => {
    const body = convertPostableMessageToCommentBody(
      "# Heading\n\n```\ncode block\n```"
    );
    expect(body.version).toBe(1);
    const texts = body.content.flatMap((block) =>
      block.children.filter(
        (c) => "text" in c && !("type" in c && c.type === "link")
      )
    );
    expect(texts.some((t) => "text" in t && t.text.includes("Heading"))).toBe(
      true
    );
    expect(
      texts.some((t) => "text" in t && t.text.includes("code block"))
    ).toBe(true);
  });

  test("returns empty content for unexpected message shape", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const body = convertPostableMessageToCommentBody(
      {} as Parameters<typeof convertPostableMessageToCommentBody>[0]
    );
    expect(body).toEqual({ version: 1, content: [] });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("converts card with fallbackText instead of card content", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        title: "Card Title",
        children: [{ type: "text", content: "Card content" }],
      },
      fallbackText: "Fallback text here",
    });
    expect(body.version).toBe(1);
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Fallback text here");
    expect(textJoined).not.toContain("Card Title");
  });

  test("converts inline CardElement (type === 'card')", () => {
    const body = convertPostableMessageToCommentBody({
      type: "card",
      title: "Inline Card",
      children: [{ type: "text", content: "Some text" }],
    } as any);
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Inline Card");
    expect(textJoined).toContain("Some text");
  });

  test("converts card with fields", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        title: "Info",
        children: [
          {
            type: "fields",
            children: [
              { type: "field", label: "Priority", value: "High" },
              { type: "field", label: "Status", value: "Open" },
            ],
          },
        ],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Priority");
    expect(textJoined).toContain("High");
    expect(textJoined).toContain("Open");
  });

  test("converts card with actions (excluded from output)", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        title: "Actions Card",
        children: [
          {
            type: "actions",
            children: [
              {
                type: "button",
                label: "Click me",
                url: "https://example.com",
              },
            ],
          } as any,
        ],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Actions Card");
    expect(textJoined).not.toContain("Click me");
  });

  test("converts card with link child", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        children: [
          { type: "link", label: "Visit", url: "https://example.com" },
        ],
      },
    });
    const allChildren = body.content.flatMap((p) => p.children);
    const linkChild = allChildren.find((c) => "type" in c && c.type === "link");
    expect(linkChild).toBeDefined();
  });

  test("converts card with divider", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        title: "Top",
        children: [{ type: "divider" }, { type: "text", content: "Bottom" }],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Top");
    expect(textJoined).toContain("Bottom");
  });

  test("converts card with image", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        children: [
          {
            type: "image",
            url: "https://example.com/img.png",
            alt: "photo",
          },
        ],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("https://example.com/img.png");
  });

  test("converts card with section containing nested children", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        children: [
          {
            type: "section",
            children: [
              { type: "text", content: "Section text" },
              { type: "link", label: "Link", url: "https://example.com" },
            ],
          },
        ],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Section text");
  });

  test("converts card with table", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        children: [
          {
            type: "table",
            headers: ["Name", "Age"],
            rows: [
              ["Alice", "30"],
              ["Bob", "25"],
            ],
          },
        ],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Name");
    expect(textJoined).toContain("Alice");
    expect(textJoined).toContain("Bob");
  });

  test("converts card with only subtitle (no title)", () => {
    const body = convertPostableMessageToCommentBody({
      card: {
        type: "card",
        subtitle: "Just a subtitle",
        children: [],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("Just a subtitle");
  });

  test("flattens blockquotes into paragraphs", () => {
    const body = convertPostableMessageToCommentBody("> quoted text");
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("quoted text");
  });

  test("flattens lists into paragraphs", () => {
    const body = convertPostableMessageToCommentBody("- item one\n- item two");
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("item one");
    expect(textJoined).toContain("item two");
  });

  test("converts HTML nodes to text paragraphs", () => {
    const body = convertPostableMessageToCommentBody({
      ast: {
        type: "root",
        children: [{ type: "html", value: "<b>bold</b>" }],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("<b>bold</b>");
  });

  test("drops unsupported node types (break, thematicBreak, etc.)", () => {
    const body = convertPostableMessageToCommentBody({
      ast: {
        type: "root",
        children: [
          { type: "thematicBreak" },
          {
            type: "paragraph",
            children: [{ type: "text", value: "after break" }],
          },
        ],
      },
    });
    const textJoined = body.content
      .flatMap((p) => p.children.map((c) => ("text" in c ? c.text : "")))
      .join("");
    expect(textJoined).toContain("after break");
    expect(body.content).toHaveLength(1);
  });
});
