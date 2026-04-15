import { Liveblocks } from "@liveblocks/node";
import { describe, expectTypeOf, test } from "vitest";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
  Json,
  PlainLson,
  ReadonlyJsonObject,
} from "@liveblocks/core";

describe("Liveblocks client without Liveblocks augmentation", () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  test("should return a session with authorize() response types", async () => {
    const session = client.prepareSession("user-123");
    session.allow("org1:*", session.READ_ACCESS);
    const resp = await session.authorize();
    expectTypeOf(resp.status).toEqualTypeOf<number>();
    expectTypeOf(resp.body).toEqualTypeOf<string>();
    expectTypeOf(resp.error).toEqualTypeOf<Error | undefined>();
  });

  test("should return a session with authorize() response types when userInfo is provided", async () => {
    const session = client.prepareSession("user-123", {
      userInfo: { name: "Vincent", age: 42 },
    });
    session.allow("org1:*", session.READ_ACCESS);
    const resp = await session.authorize();
    expectTypeOf(resp.status).toEqualTypeOf<number>();
    expectTypeOf(resp.body).toEqualTypeOf<string>();
    expectTypeOf(resp.error).toEqualTypeOf<Error | undefined>();
  });

  test("should reject non-JSON values in prepareSession() userInfo", () => {
    client.prepareSession("user-123", {
      userInfo: { foo: "bar" },
    });

    client.prepareSession("user-123", {
      userInfo: {
        foo: "bar",
        // @ts-expect-error non-JSON in userInfo
        notJson: new Date(),
      },
    });
  });

  test("should accept identifyUser() without userInfo", async () => {
    await client.identifyUser("user-123");
  });

  test("should return correct response types from identifyUser()", async () => {
    const resp = await client.identifyUser("user-123", {
      userInfo: { name: "Vincent", age: 42 },
    });
    expectTypeOf(resp.status).toEqualTypeOf<number>();
    expectTypeOf(resp.body).toEqualTypeOf<string>();
    expectTypeOf(resp.error).toEqualTypeOf<Error | undefined>();
  });

  test("should reject non-JSON values in identifyUser() userInfo", async () => {
    await client.identifyUser("user-123", {
      userInfo: { foo: "bar" },
    });

    await client.identifyUser("user-123", {
      userInfo: {
        foo: "bar",
        // @ts-expect-error non-JSON in userInfo
        notJson: new Date(),
      },
    });
  });

  test("should return loosely typed user info from getActiveUsers()", async () => {
    const users = (await client.getActiveUsers("my-room")).data;
    const user = users[0]!;
    expectTypeOf(user.type).toEqualTypeOf<"user">();
    expectTypeOf(user.connectionId).toEqualTypeOf<number>();
    expectTypeOf(user.id).toEqualTypeOf<string | null>();

    const info = user.info!;
    expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
    expectTypeOf(info.age).toEqualTypeOf<Json | undefined>();
    expectTypeOf(info.nonexisting).toEqualTypeOf<Json | undefined>();
  });

  test("should accept any JSON payload in broadcastEvent()", async () => {
    // @ts-expect-error payload is required
    client.broadcastEvent("my-room");
    // @ts-expect-error invalid broadcast payload
    client.broadcastEvent("my-room", { date: Date });

    await client.broadcastEvent("my-room", 123);
    await client.broadcastEvent("my-room", [1, 2, 3]);
    await client.broadcastEvent("my-room", { type: "foo" });
    await client.broadcastEvent("my-room", { type: "boop" });
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

  test("should return ReadonlyJsonObject from getStorageDocument() with 'json' format", async () => {
    const root = await client.getStorageDocument("my-room", "json");
    expectTypeOf(root).toEqualTypeOf<ReadonlyJsonObject>();
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

  test("should accept arbitrary metadata in createThread() and return loosely typed thread", async () => {
    // @ts-expect-error invalid createThread arguments
    client.createThread({ data: {} });
    // @ts-expect-error invalid createThread arguments
    client.createThread({ roomId: "my-room" });
    client.createThread({
      roomId: "my-room",
      // @ts-expect-error invalid createThread arguments
      data: {},
    });

    client.createThread({
      roomId: "my-room",
      data: {
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
        },
        metadata: { foo: "bar" },
      },
    });

    const thread = await client.createThread({
      roomId: "room-123",
      data: {
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
        },
        metadata: { color: "red" },
      },
    });

    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.metadata.color).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(thread.metadata.nonexisting).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });

  test("should accept arbitrary metadata in editThreadMetadata()", async () => {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const userId = "user-123";

    // @ts-expect-error invalid editThreadMetadata arguments
    client.editThreadMetadata({ roomId });
    // @ts-expect-error invalid editThreadMetadata arguments
    client.editThreadMetadata({ threadId });
    client.editThreadMetadata({
      roomId: "my-room",
      threadId: "th_xxx",
      // @ts-expect-error invalid editThreadMetadata arguments
      data: {},
    });
    client.editThreadMetadata({
      roomId,
      threadId,
      // @ts-expect-error invalid editThreadMetadata arguments
      data: { userId },
    });

    await client.editThreadMetadata({
      roomId,
      threadId,
      data: { userId, metadata: { foo: "bar", color: null } },
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
  });

  test("should return loosely typed thread metadata from getThreads()", async () => {
    const threads = (await client.getThreads({ roomId: "my-room" })).data;
    const thread = threads[0]!;
    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.roomId).toEqualTypeOf<string>();
    expectTypeOf(thread.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.updatedAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.metadata.foo).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(thread.metadata.nonexisting).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });

  test("should return loosely typed thread metadata from getThread()", async () => {
    const thread = await client.getThread({
      roomId: "my-room",
      threadId: "th_xxx",
    });
    expectTypeOf(thread.type).toEqualTypeOf<"thread">();
    expectTypeOf(thread.id).toEqualTypeOf<string>();
    expectTypeOf(thread.roomId).toEqualTypeOf<string>();
    expectTypeOf(thread.createdAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.updatedAt).toEqualTypeOf<Date>();
    expectTypeOf(thread.metadata.foo).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(thread.metadata.nonexisting).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(thread.comments).toEqualTypeOf<CommentData[]>();
  });

  test("should accept arbitrary metadata in createComment() and return loosely typed comment", async () => {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const userId = "user-123";

    // @ts-expect-error invalid createComment arguments
    client.createComment({ roomId });
    // @ts-expect-error invalid createComment arguments
    client.createComment({ threadId });
    client.createComment({
      roomId: "my-room",
      threadId: "th_xxx",
      // @ts-expect-error invalid createComment arguments
      data: {},
    });
    client.createComment({
      roomId: "my-room",
      threadId: "th_xxx",
      // @ts-expect-error invalid createComment arguments
      data: { userId },
    });

    const comment = await client.createComment({
      roomId,
      threadId,
      data: {
        userId,
        body: { version: 1, content: [] },
      },
    });

    expectTypeOf(comment.type).toEqualTypeOf<"comment">();
    expectTypeOf(comment.id).toEqualTypeOf<string>();
    expectTypeOf(comment.threadId).toEqualTypeOf<string>();
    expectTypeOf(comment.metadata.foo).toEqualTypeOf<
      string | number | boolean | undefined
    >();

    const commentWithMetadata = await client.createComment({
      roomId,
      threadId,
      data: {
        userId,
        body: { version: 1, content: [] },
        metadata: { status: "pending", priority: 1 },
      },
    });

    expectTypeOf(commentWithMetadata.type).toEqualTypeOf<"comment">();
    expectTypeOf(commentWithMetadata.metadata.status).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    expectTypeOf(commentWithMetadata.metadata.priority).toEqualTypeOf<
      string | number | boolean | undefined
    >();
  });

  test("should accept arbitrary metadata in editCommentMetadata()", async () => {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const commentId = "cm_xxx";
    const userId = "user-123";

    // @ts-expect-error invalid editCommentMetadata arguments
    client.editCommentMetadata({ roomId });
    // @ts-expect-error invalid editCommentMetadata arguments
    client.editCommentMetadata({ threadId });
    // @ts-expect-error invalid editCommentMetadata arguments
    client.editCommentMetadata({ commentId });
    client.editCommentMetadata({
      roomId: "my-room",
      threadId: "th_xxx",
      commentId: "cm_xxx",
      // @ts-expect-error invalid editCommentMetadata arguments
      data: {},
    });
    client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      // @ts-expect-error invalid editCommentMetadata arguments
      data: { userId },
    });

    await client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: { userId, metadata: { foo: "bar", status: null } },
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
      data: { userId, metadata: { priority: 2, reviewed: null } },
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
