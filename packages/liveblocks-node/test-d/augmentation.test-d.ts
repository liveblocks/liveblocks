import { expectError, expectType } from "tsd";
import { Liveblocks } from "../src/client";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
  LiveList,
  LiveMap,
  LiveObject,
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

    RoomEvent: {
      type: "emoji";
      emoji: string;
    };

    ThreadMetadata: {
      color: "red" | "blue";
    };

    RoomInfo: {
      name: string;
      url?: string;
      type: "public" | "private";
    };
  }
}

async () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  // .getActiveUsers()
  {
    const users = (await client.getActiveUsers("my-room")).data;
    const user = users[0]!;
    expectType<"user">(user.type);
    expectType<number>(user.connectionId);
    expectType<string | null>(user.id);
    expectType<string>(user.info.name);
    expectType<number>(user.info.age);
    expectError(user.info.nonexisting);
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
    expectType<"red" | "blue">(thread.metadata.color);
    expectError(thread.metadata.nonexisting);
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
    expectType<"red" | "blue">(thread.metadata.color);
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
