import { Liveblocks } from "@liveblocks/node";
import { describe, expectTypeOf, test } from "vitest";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
  PlainLson,
} from "@liveblocks/core";

//
// User-provided type augmentations
//
declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number };
    };

    Storage: {
      animals: LiveList<string>;
      scores: LiveMap<string, number>;
      person: LiveObject<{ name: string; age: number }>;
    };

    UserMeta: {
      info: {
        name: string;
        age: number;
      };
    };

    RoomEvent:
      | { type: "emoji"; emoji: string }
      | { type: "beep"; times?: number };

    ThreadMetadata: {
      color: "red" | "blue";
      pinned?: boolean;
    };

    CommentMetadata: {
      priority: number;
      reviewed?: boolean;
    };

    RoomInfo: {
      name: string;
      url?: string;
      type: "public" | "private";
    };

    GroupInfo: {
      name: string;
      avatar?: string;
      type: "open" | "closed";
    };
  }
}

describe("Liveblocks client with Liveblocks augmentation", () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  test("should reject prepareSession() without mandatory userInfo", () => {
    // @ts-expect-error - userInfo must include name and age
    client.prepareSession("user-123");
    // @ts-expect-error - userInfo must include name and age
    client.prepareSession("user-123", {});
    // @ts-expect-error - userInfo must include name and age
    client.prepareSession("user-123", { userInfo: {} });
    client.prepareSession("user-123", {
      // @ts-expect-error - userInfo must include age
      userInfo: { name: "Vincent" },
    });
    client.prepareSession("user-123", {
      // @ts-expect-error - userInfo must include name
      userInfo: { age: 42 },
    });
  });

  test("should return a session with authorize() response types when correct userInfo is provided", async () => {
    const session = client.prepareSession("user-123", {
      userInfo: { name: "Vincent", age: 42 },
    });
    session.allow("org1:*", session.READ_ACCESS);
    const resp = await session.authorize();
    expectTypeOf(resp.status).toEqualTypeOf<number>();
    expectTypeOf(resp.body).toEqualTypeOf<string>();
    expectTypeOf(resp.error).toEqualTypeOf<Error | undefined>();
  });

  test("should reject prepareSession() with incorrect user info", () => {
    client.prepareSession("user-123", {
      userInfo: {
        // @ts-expect-error - userInfo shape must match UserMeta
        foo: "bar",
      },
    });
  });

  test("should reject identifyUser() without mandatory userInfo", async () => {
    // @ts-expect-error - userInfo must include name and age
    await client.identifyUser("user-123");
    // @ts-expect-error - userInfo must include name and age
    await client.identifyUser("user-123", {});
    // @ts-expect-error - userInfo must include name and age
    await client.identifyUser("user-123", { userInfo: {} });
    await client.identifyUser("user-123", {
      // @ts-expect-error - userInfo must include age
      userInfo: { name: "Vincent" },
    });
    await client.identifyUser("user-123", {
      // @ts-expect-error - userInfo must include name
      userInfo: { age: 42 },
    });
  });

  test("should return correct response types from identifyUser() when correct userInfo is provided", async () => {
    const resp = await client.identifyUser("user-123", {
      userInfo: { name: "Vincent", age: 42 },
    });
    expectTypeOf(resp.status).toEqualTypeOf<number>();
    expectTypeOf(resp.body).toEqualTypeOf<string>();
    expectTypeOf(resp.error).toEqualTypeOf<Error | undefined>();
  });

  test("should reject identifyUser() with incorrect user info", async () => {
    await client.identifyUser("user-123", {
      userInfo: {
        // @ts-expect-error - userInfo shape must match UserMeta
        foo: "bar",
      },
    });

    await client.identifyUser("user-123", {
      userInfo: {
        // @ts-expect-error - userInfo must be JSON-serializable
        notJson: new Date(),
      },
    });
  });

  test("should return typed user info from getActiveUsers()", async () => {
    const users = (await client.getActiveUsers("my-room")).data;
    const user = users[0]!;
    expectTypeOf(user.type).toEqualTypeOf<"user">();
    expectTypeOf(user.connectionId).toEqualTypeOf<number>();
    expectTypeOf(user.id).toEqualTypeOf<string | null>();
    expectTypeOf(user.info.name).toEqualTypeOf<string>();
    expectTypeOf(user.info.age).toEqualTypeOf<number>();
    // @ts-expect-error - unknown UserMeta field
    user.info.nonexisting;
  });

  test("should only accept typed RoomEvents in broadcastEvent()", async () => {
    // @ts-expect-error - payload is required
    client.broadcastEvent("my-room");
    client.broadcastEvent("my-room", {
      // @ts-expect-error - invalid broadcast payload
      date: Date,
    });

    // @ts-expect-error - event must match RoomEvent
    client.broadcastEvent("my-room", 123);
    // @ts-expect-error - event must match RoomEvent
    client.broadcastEvent("my-room", [1, 2, 3]);
    // @ts-expect-error - event must match RoomEvent
    client.broadcastEvent("my-room", { type: "foo" });
    // @ts-expect-error - event must match RoomEvent
    client.broadcastEvent("my-room", { type: "boop" });

    await client.broadcastEvent("my-room", { type: "emoji", emoji: "😍" });
    await client.broadcastEvent("my-room", { type: "beep" });
    await client.broadcastEvent("my-room", { type: "beep", times: 3 });
  });

  test("should return PlainLson root from getStorageDocument()", async () => {
    const root = await client.getStorageDocument("my-room");
    expectTypeOf(root.liveblocksType).toEqualTypeOf<"LiveObject">();
    expectTypeOf(root.data.liveblocksType).toEqualTypeOf<
      PlainLson | undefined
    >();
  });

  test("should return PlainLson root from getStorageDocument() with 'plain-lson' format", async () => {
    const root = await client.getStorageDocument("my-room", "plain-lson");
    expectTypeOf(root.liveblocksType).toEqualTypeOf<"LiveObject">();
    expectTypeOf(root.data.liveblocksType).toEqualTypeOf<
      PlainLson | undefined
    >();
  });

  test("should return typed Storage shape from getStorageDocument() with 'json' format", async () => {
    const root = await client.getStorageDocument("my-room", "json");
    expectTypeOf(root.animals).toEqualTypeOf<readonly string[]>();
    expectTypeOf(root.person.name).toEqualTypeOf<string>();
    expectTypeOf(root.person.age).toEqualTypeOf<number>();
    expectTypeOf(root.scores["foo"]).toEqualTypeOf<number | undefined>();
  });

  test("should return correct comment shape from getComment()", async () => {
    const comment = await client.getComment({
      roomId: "my-room",
      threadId: "th_xxx",
      commentId: "cm_xxx",
    });
    expectTypeOf(comment.type).toEqualTypeOf<"comment">();
    expectTypeOf(comment.id).toEqualTypeOf<string>();
    expectTypeOf(comment.threadId).toEqualTypeOf<string>();
    expectTypeOf(comment.roomId).toEqualTypeOf<string>();
    expectTypeOf(comment.userId).toEqualTypeOf<string>();
    expectTypeOf(comment.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(comment.editedAt).toEqualTypeOf<Date | undefined>();
    expectTypeOf(comment.reactions).toEqualTypeOf<CommentReaction[]>();
    expectTypeOf(comment.deletedAt).toEqualTypeOf<Date | undefined>();

    expectTypeOf(comment.body).toEqualTypeOf<CommentBody | undefined>();
    expectTypeOf(comment.body?.version).toEqualTypeOf<1 | undefined>();
    expectTypeOf(comment.body?.content).toEqualTypeOf<
      CommentBodyBlockElement[] | undefined
    >();
  });

  test("should enforce typed metadata in createThread() and return typed thread", async () => {
    // @ts-expect-error - invalid createThread arguments
    client.createThread({ data: {} });
    // @ts-expect-error - invalid createThread arguments
    client.createThread({ roomId: "my-room" });
    client.createThread({
      roomId: "my-room",
      // @ts-expect-error - invalid createThread arguments
      data: {},
    });

    client.createThread({
      roomId: "my-room",
      data: {
        // @ts-expect-error - comment must include CommentMetadata
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
        },
      },
    });

    client.createThread({
      roomId: "my-room",
      data: {
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
          metadata: { priority: 1 },
        },
        // @ts-expect-error - ThreadMetadata shape
        metadata: { foo: "bar" },
      },
    });

    const thread = await client.createThread({
      roomId: "room-123",
      data: {
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
          metadata: { priority: 1 },
        },
        metadata: { color: "red" },
      },
    });

    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
    // @ts-expect-error - unknown ThreadMetadata field
    thread.metadata.nonexisting;
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();

    const threadWithCommentMetadata = await client.createThread({
      roomId: "room-123",
      data: {
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
          metadata: {
            priority: 2,
            reviewed: false,
          },
        },
        metadata: { color: "blue" },
      },
    });

    expectTypeOf(threadWithCommentMetadata.type).toEqualTypeOf<"thread">();
    expectTypeOf(
      threadWithCommentMetadata.comments[0]!.metadata.priority
    ).toEqualTypeOf<number>();
    expectTypeOf(
      threadWithCommentMetadata.comments[0]!.metadata.reviewed
    ).toEqualTypeOf<boolean | undefined>();
    // @ts-expect-error - unknown CommentMetadata field
    threadWithCommentMetadata.comments[0]!.metadata.nonexisting;
  });

  test("should enforce typed metadata in editThreadMetadata()", async () => {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const userId = "user-123";

    // @ts-expect-error - invalid editThreadMetadata arguments
    client.editThreadMetadata({ roomId });
    // @ts-expect-error - invalid editThreadMetadata arguments
    client.editThreadMetadata({ threadId });
    client.editThreadMetadata({
      roomId: "my-room",
      threadId: "th_xxx",
      // @ts-expect-error - invalid editThreadMetadata arguments
      data: {},
    });
    client.editThreadMetadata({
      roomId,
      threadId,
      // @ts-expect-error - invalid editThreadMetadata arguments
      data: { userId },
    });

    client.editThreadMetadata({
      roomId,
      threadId,
      data: {
        userId,
        // @ts-expect-error - metadata must match ThreadMetadata
        metadata: { foo: "bar" },
      },
    });

    await client.editThreadMetadata({
      roomId,
      threadId,
      data: { userId, metadata: {} },
    });

    await client.editThreadMetadata({
      roomId,
      threadId,
      data: { userId, metadata: { color: "red", pinned: null } },
    });

    client.editThreadMetadata({
      roomId,
      threadId,
      data: {
        userId,
        metadata: {
          // @ts-expect-error - color cannot be null
          color: null,
        },
      },
    });

    client.editThreadMetadata({
      roomId,
      threadId,
      data: {
        userId,
        metadata: {
          // @ts-expect-error - unknown ThreadMetadata field
          foo: null,
        },
      },
    });
  });

  test("should return typed thread metadata from getThreads()", async () => {
    const threads = (await client.getThreads({ roomId: "my-room" })).data;
    const thread = threads[0]!;
    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.roomId).toEqualTypeOf<string>();
    expectTypeOf(thread.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.updatedAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
    // @ts-expect-error - unknown ThreadMetadata field
    thread.metadata.nonexisting;
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });

  test("should return typed thread metadata from getThread()", async () => {
    const thread = await client.getThread({
      roomId: "my-room",
      threadId: "th_xxx",
    });
    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.roomId).toEqualTypeOf<string>();
    expectTypeOf(thread.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.updatedAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
    // @ts-expect-error - unknown ThreadMetadata field
    thread.metadata.nonexisting;
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });

  test("should enforce typed metadata in createComment() and return typed comment", async () => {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const userId = "user-123";

    // @ts-expect-error - invalid createComment arguments
    client.createComment({ roomId });
    // @ts-expect-error - invalid createComment arguments
    client.createComment({ threadId });
    client.createComment({
      roomId: "my-room",
      threadId: "th_xxx",
      // @ts-expect-error - invalid createComment arguments
      data: {},
    });
    client.createComment({
      roomId: "my-room",
      threadId: "th_xxx",
      // @ts-expect-error - invalid createComment arguments
      data: { userId },
    });

    const comment = await client.createComment({
      roomId,
      threadId,
      data: {
        userId,
        body: { version: 1, content: [] },
        metadata: { priority: 1 },
      },
    });

    expectTypeOf(comment.type).toEqualTypeOf<"comment">();
    expectTypeOf(comment.id).toEqualTypeOf<string>();
    expectTypeOf(comment.threadId).toEqualTypeOf<string>();

    const commentWithMetadata = await client.createComment({
      roomId,
      threadId,
      data: {
        userId,
        body: { version: 1, content: [] },
        metadata: {
          priority: 2,
          reviewed: false,
        },
      },
    });

    expectTypeOf(commentWithMetadata.type).toEqualTypeOf<"comment">();
    expectTypeOf(commentWithMetadata.metadata.priority).toEqualTypeOf<number>();
    expectTypeOf(commentWithMetadata.metadata.reviewed).toEqualTypeOf<
      boolean | undefined
    >();
    // @ts-expect-error - unknown CommentMetadata field
    commentWithMetadata.metadata.nonexisting;
  });

  test("should enforce typed metadata in editCommentMetadata()", async () => {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const commentId = "cm_xxx";
    const userId = "user-123";

    // @ts-expect-error - invalid editCommentMetadata arguments
    client.editCommentMetadata({ roomId });
    // @ts-expect-error - invalid editCommentMetadata arguments
    client.editCommentMetadata({ threadId });
    // @ts-expect-error - invalid editCommentMetadata arguments
    client.editCommentMetadata({ commentId });
    client.editCommentMetadata({
      roomId: "my-room",
      threadId: "th_xxx",
      commentId: "cm_xxx",
      // @ts-expect-error - invalid editCommentMetadata arguments
      data: {},
    });
    client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      // @ts-expect-error - invalid editCommentMetadata arguments
      data: { userId },
    });

    client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: {
        userId,
        // @ts-expect-error - metadata must match CommentMetadata
        metadata: { foo: "bar" },
      },
    });

    await client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: { userId, metadata: {} },
    });

    await client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: {
        userId,
        metadata: { priority: 2, reviewed: null },
      },
    });

    client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: {
        userId,
        metadata: {
          // @ts-expect-error - priority cannot be null
          priority: null,
        },
      },
    });

    client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: {
        userId,
        metadata: {
          // @ts-expect-error - unknown CommentMetadata field
          foo: null,
        },
      },
    });
  });

  test("should return correct reaction shape from addCommentReaction()", async () => {
    const reaction = await client.addCommentReaction({
      roomId: "my-room",
      threadId: "th_xxx",
      commentId: "cm_xxx",
      data: {
        emoji: "👍",
        userId: "user-id",
      },
    });

    expectTypeOf(reaction.emoji).toEqualTypeOf<string>();
    expectTypeOf(reaction.userId).toEqualTypeOf<string>();
    expectTypeOf(reaction.createdAt).toEqualTypeOf<Date>();
  });

  test("should return correct thread shape from markThreadAsResolved()", async () => {
    const thread = await client.markThreadAsResolved({
      roomId: "my-room",
      threadId: "th_xxx",
      data: {
        userId: "user-id",
      },
    });
    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.roomId).toEqualTypeOf<string>();
    expectTypeOf(thread.resolved).toEqualTypeOf<boolean>();
    expectTypeOf(thread.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.updatedAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });

  test("should return correct thread shape from markThreadAsUnresolved()", async () => {
    const thread = await client.markThreadAsUnresolved({
      roomId: "my-room",
      threadId: "th_xxx",
      data: {
        userId: "user-id",
      },
    });
    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.roomId).toEqualTypeOf<string>();
    expectTypeOf(thread.resolved).toEqualTypeOf<boolean>();
    expectTypeOf(thread.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.updatedAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });
});
