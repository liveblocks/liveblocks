import { expectError, expectType } from "tsd";
import { Liveblocks } from "@liveblocks/node";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
  Json,
  PlainLson,
  JsonObject,
} from "@liveblocks/core";

async () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  // .prepareSession()
  {
    const session = await client.prepareSession("user-123");
    session.allow("org1:*", session.READ_ACCESS);
    const resp = await session.authorize();
    expectType<number>(resp.status);
    expectType<string>(resp.body);
    expectType<Error | undefined>(resp.error);
  }

  // .prepareSession() with user info
  {
    const session = await client.prepareSession("user-123", {
      userInfo: { name: "Vincent", age: 42 },
    });
    session.allow("org1:*", session.READ_ACCESS);
    const resp = await session.authorize();
    expectType<number>(resp.status);
    expectType<string>(resp.body);
    expectType<Error | undefined>(resp.error);
  }

  // .prepareSession() with arbitrary user info
  {
    await client.prepareSession("user-123", {
      userInfo:
        // Arbitrary user info is fine...
        { foo: "bar" },
    });

    expectError(
      await client.prepareSession("user-123", {
        userInfo:
          // ...but non-JSON is not
          { foo: "bar", notJson: new Date() },
      })
    );
  }

  // .identifyUser() bare
  {
    await client.identifyUser("user-123");
  }

  // .identifyUser() with user info
  {
    const resp = await client.identifyUser("user-123", {
      userInfo: { name: "Vincent", age: 42 },
    });
    expectType<number>(resp.status);
    expectType<string>(resp.body);
    expectType<Error | undefined>(resp.error);
  }

  // .identifyUser() with arbitrary user info
  {
    await client.identifyUser("user-123", {
      userInfo:
        // Arbitrary user info is fine...
        { foo: "bar" },
    });

    expectError(
      await client.identifyUser("user-123", {
        userInfo:
          // ...but non-JSON is not
          { foo: "bar", notJson: new Date() },
      })
    );
  }

  // .getActiveUsers()
  {
    const users = (await client.getActiveUsers("my-room")).data;
    const user = users[0]!;
    expectType<"user">(user.type);
    expectType<number>(user.connectionId);
    expectType<string | null>(user.id);

    const info = user.info!;
    expectType<string | undefined>(info.name);
    expectType<Json | undefined>(info.age);
    expectType<Json | undefined>(info.nonexisting);
  }

  // .broadcastEvent()
  {
    expectError(client.broadcastEvent("my-room"));
    expectError(client.broadcastEvent("my-room", { date: Date }));

    await client.broadcastEvent("my-room", 123);
    await client.broadcastEvent("my-room", [1, 2, 3]);
    await client.broadcastEvent("my-room", { type: "foo" });
    await client.broadcastEvent("my-room", { type: "boop" });
    await client.broadcastEvent("my-room", { type: "emoji", emoji: "😍" });
    await client.broadcastEvent("my-room", { type: "beep" });
    await client.broadcastEvent("my-room", { type: "beep", times: 3 });
  }

  // .getStorageDocument() (implicit plain LSON format)
  {
    const root = await client.getStorageDocument("my-room");
    expectType<"LiveObject">(root.liveblocksType);
    expectType<PlainLson | undefined>(root.data.liveblocksType);
  }

  // .getStorageDocument() (explicit plain LSON format)
  {
    const root = await client.getStorageDocument("my-room", "plain-lson");
    expectType<"LiveObject">(root.liveblocksType);
    expectType<PlainLson | undefined>(root.data.liveblocksType);
  }

  // .getStorageDocument() (simplified JSON format)
  {
    const root = await client.getStorageDocument("my-room", "json");
    expectType<JsonObject>(root);
  }

  // .getComment()
  {
    const comment = await client.getComment({
      roomId: "my-room",
      threadId: "th_xxx",
      commentId: "cm_xxx",
    });
    expectType<"comment">(comment.type);
    expectType<string>(comment.id);
    expectType<string>(comment.threadId);
    expectType<string>(comment.roomId);
    expectType<string>(comment.userId);
    expectType<Date>(comment.createdAt);
    expectType<Date | undefined>(comment.editedAt);
    expectType<CommentReaction[]>(comment.reactions);
    expectType<Date | undefined>(comment.deletedAt);

    expectType<CommentBody | undefined>(comment.body);
    expectType<1 | undefined>(comment.body?.version);
    expectType<CommentBodyBlockElement[] | undefined>(comment.body?.content);
  }

  // .createThread()
  {
    // Invalid calls
    expectError(client.createThread({ data: {} }));
    expectError(client.createThread({ roomId: "my-room" }));
    expectError(client.createThread({ roomId: "my-room", data: {} }));

    // In this un-augmented world, this is fine
    client.createThread({
      roomId: "my-room",
      data: {
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
        },
      },
    });

    // In this un-augmented world, this is fine
    client.createThread({
      roomId: "my-room",
      data: {
        comment: {
          userId: "user-123",
          body: { version: 1, content: [] },
        },
        metadata: { foo: "bar" }, // Arbitrary metadata!
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

    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string | number | boolean | undefined>(thread.metadata.color);
    expectType<string | number | boolean | undefined>(
      thread.metadata.nonexisting
    );
    expectType<CommentData[]>(thread.comments);
  }

  // .editThreadMetadata()
  {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const userId = "user-123";

    // Invalid calls
    expectError(client.editThreadMetadata({ roomId }));
    expectError(client.editThreadMetadata({ threadId }));
    expectError(
      client.editThreadMetadata({
        roomId: "my-room",
        threadId: "th_xxx",
        data: {},
      })
    );
    expectError(
      client.editThreadMetadata({ roomId, threadId, data: { userId } })
    );

    // Arbitrary metadata updates are fine in an unaugmented world
    await client.editThreadMetadata({
      roomId,
      threadId,
      data: { userId, metadata: { foo: "bar", color: null } },
    });

    await client.editThreadMetadata({
      roomId,
      threadId,
      data: { userId, metadata: {} }, // Not updating any fields is useless, but fine
    });

    await client.editThreadMetadata({
      roomId,
      threadId,
      data: { userId, metadata: { color: "red", pinned: null } }, // Correct metadata updates
    });
  }

  // .getThreads()
  {
    const threads = (await client.getThreads({ roomId: "my-room" })).data;
    const thread = threads[0]!;
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<Date>(thread.createdAt);
    expectType<Date>(thread.updatedAt);
    expectType<string | number | boolean | undefined>(thread.metadata.foo);
    expectType<string | number | boolean | undefined>(
      thread.metadata.nonexisting
    );
    expectType<CommentData[]>(thread.comments);
  }

  // .getThread()
  {
    const thread = await client.getThread({
      roomId: "my-room",
      threadId: "th_xxx",
    });
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<Date>(thread.createdAt);
    expectType<Date>(thread.updatedAt);
    expectType<string | number | boolean | undefined>(thread.metadata.foo);
    expectType<string | number | boolean | undefined>(
      thread.metadata.nonexisting
    );
    expectType<CommentData[]>(thread.comments);
  }

  // .createComment()
  {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const userId = "user-123";

    // Invalid calls
    expectError(client.createComment({ roomId }));
    expectError(client.createComment({ threadId }));
    expectError(
      client.createComment({
        roomId: "my-room",
        threadId: "th_xxx",
        data: {},
      })
    );
    expectError(
      client.createComment({
        roomId: "my-room",
        threadId: "th_xxx",
        data: { userId },
      })
    );

    const comment = await client.createComment({
      roomId,
      threadId,
      data: {
        userId,
        body: { version: 1, content: [] },
      },
    });

    expectType<"comment">(comment.type);
    expectType<string>(comment.id);
    expectType<string>(comment.threadId);
    expectType<string | number | boolean | undefined>(comment.metadata.foo);

    const commentWithMetadata = await client.createComment({
      roomId,
      threadId,
      data: {
        userId,
        body: { version: 1, content: [] },
        metadata: { status: "pending", priority: 1 },
      },
    });

    expectType<"comment">(commentWithMetadata.type);
    expectType<string | number | boolean | undefined>(
      commentWithMetadata.metadata.status
    );
    expectType<string | number | boolean | undefined>(
      commentWithMetadata.metadata.priority
    );
  }

  // .editCommentMetadata()
  {
    const roomId = "my-room";
    const threadId = "th_xxx";
    const commentId = "cm_xxx";
    const userId = "user-123";

    // Invalid calls
    expectError(client.editCommentMetadata({ roomId }));
    expectError(client.editCommentMetadata({ threadId }));
    expectError(client.editCommentMetadata({ commentId }));
    expectError(
      client.editCommentMetadata({
        roomId: "my-room",
        threadId: "th_xxx",
        commentId: "cm_xxx",
        data: {},
      })
    );
    expectError(
      client.editCommentMetadata({
        roomId,
        threadId,
        commentId,
        data: { userId },
      })
    );

    // Arbitrary metadata updates are fine in an unaugmented world
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
      data: { userId, metadata: {} }, // Not updating any fields is useless, but fine
    });

    await client.editCommentMetadata({
      roomId,
      threadId,
      commentId,
      data: { userId, metadata: { status: "resolved", priority: null } },
    });
  }

  // .addCommentReaction()
  {
    const reaction = await client.addCommentReaction({
      roomId: "my-room",
      threadId: "th_xxx",
      commentId: "cm_xxx",
      data: {
        emoji: "👍",
        userId: "user-id",
      },
    });

    expectType<string>(reaction.emoji);
    expectType<string>(reaction.userId);
    expectType<Date>(reaction.createdAt);
  }
  // .markThreadAsResolved()
  {
    const thread = await client.markThreadAsResolved({
      roomId: "my-room",
      threadId: "th_xxx",
      data: {
        userId: "user-id",
      },
    });
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<boolean>(thread.resolved);
    expectType<Date>(thread.createdAt);
    expectType<Date>(thread.updatedAt);
    expectType<CommentData[]>(thread.comments);
  }
  // .markThreadAsUnresolved()
  {
    const thread = await client.markThreadAsUnresolved({
      roomId: "my-room",
      threadId: "th_xxx",
      data: {
        userId: "user-id",
      },
    });
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<boolean>(thread.resolved);
    expectType<Date>(thread.createdAt);
    expectType<Date>(thread.updatedAt);
    expectType<CommentData[]>(thread.comments);
  }
};
