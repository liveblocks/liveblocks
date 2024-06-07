import { expectError, expectType } from "tsd";
import { Liveblocks } from "../src/client";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
} from "@liveblocks/core";

type ThreadMetadata = {
  abc: number;
};

declare global {
  interface Liveblocks {
    ThreadMetadata: ThreadMetadata;
  }
}

async () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  // .getComment()
  {
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
  }

  // .getThread()
  {
    const thread = await client.getThread({
      roomId: "room-id",
      threadId: "th_threadId",
    });
    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<Date>(thread.createdAt);
    expectType<Date | undefined>(thread.updatedAt);
    expectType<number>(thread.metadata.abc);
    expectError(thread.metadata.nonexisting);
    expectType<CommentData[]>(thread.comments);
  }

  // .addCommentReaction()
  {
    const reaction = await client.addCommentReaction({
      roomId: "room-id",
      threadId: "th_threadId",
      commentId: "cm_commentId",
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
