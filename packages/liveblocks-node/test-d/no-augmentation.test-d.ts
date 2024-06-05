import { expectError, expectType } from "tsd";
import { Liveblocks } from "../src/client";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
} from "@liveblocks/core";

async () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  const comment = await client.getComment({
    roomId: "room-id",
    threadId: "th_threadId",
    commentId: "cm_commentId",
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

  {
    // Without manual annotation
    const thread = await client.getThread({
      roomId: "room-id",
      threadId: "th_threadId",
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

  {
    // With manual annotation
    const thread = await client.getThread<{ foo: string }>({
      roomId: "room-id",
      threadId: "th_threadId",
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

  const commentReaction = await client.addCommentReaction({
    roomId: "room-id",
    threadId: "th_threadId",
    commentId: "cm_commentId",
    data: {
      emoji: "👍",
      userId: "user-id",
    },
  });

  expectType<string>(commentReaction.emoji);
  expectType<string>(commentReaction.userId);
  expectType<Date>(commentReaction.createdAt);
};
