import { expectError, expectType } from "tsd";
import { Liveblocks } from "../src/client";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
  Json,
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

  // .getThreads()
  {
    const threads = (await client.getThreads({ roomId: "my-room" })).data;
    const thread = threads[0]!;
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<Date>(thread.createdAt);
    expectType<Date | undefined>(thread.updatedAt);
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
    expectType<Date | undefined>(thread.updatedAt);
    expectType<string | number | boolean | undefined>(thread.metadata.foo);
    expectType<string | number | boolean | undefined>(
      thread.metadata.nonexisting
    );
    expectType<CommentData[]>(thread.comments);
  }

  // .getThread() with hard-coded annotation
  {
    type _ = never;
    const client = new Liveblocks<_, _, _, _, { foo: string }>({
      secret: "sk_xxx",
    });
    const thread = await client.getThread({
      roomId: "room",
      threadId: "th_xxx",
    });
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<Date>(thread.createdAt);
    expectType<Date | undefined>(thread.updatedAt);
    expectType<string>(thread.metadata.foo);
    expectError(thread.metadata.nonexisting);
    expectType<CommentData[]>(thread.comments);
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
};
