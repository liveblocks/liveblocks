import { expectError, expectType } from "tsd";
import { Liveblocks } from "@liveblocks/node";
import type {
  CommentReaction,
  CommentBody,
  CommentBodyBlockElement,
  CommentData,
  LiveList,
  LiveMap,
  LiveObject,
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

async () => {
  const client = new Liveblocks({ secret: "sk_xxx" });

  // .prepareSession() without all mandatory userInfo is an error
  {
    expectError(await client.prepareSession("user-123"));
    expectError(await client.prepareSession("user-123", {}));
    expectError(await client.prepareSession("user-123", { userInfo: {} }));
    expectError(
      await client.prepareSession("user-123", { userInfo: { name: "Vincent" } })
    );
    expectError(
      await client.prepareSession("user-123", { userInfo: { age: 42 } })
    );
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

  // .prepareSession() with incorrect user info
  {
    expectError(
      await client.prepareSession("user-123", { userInfo: { foo: "bar" } })
    );
  }

  // .identifyUser() without all mandatory userInfo is an error
  {
    expectError(await client.identifyUser("user-123"));
    expectError(await client.identifyUser("user-123", {}));
    expectError(await client.identifyUser("user-123", { userInfo: {} }));
    expectError(
      await client.identifyUser("user-123", { userInfo: { name: "Vincent" } })
    );
    expectError(
      await client.identifyUser("user-123", { userInfo: { age: 42 } })
    );
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

  // .identifyUser() with incorrect user info
  {
    expectError(
      await client.identifyUser("user-123", {
        userInfo:
          // Not matching the annotations...
          { foo: "bar" },
      })
    );

    expectError(
      await client.identifyUser("user-123", {
        userInfo:
          // ...or non-JSON
          { notJson: new Date() },
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
    expectType<string>(user.info.name);
    expectType<number>(user.info.age);
    expectError(user.info.nonexisting);
  }

  // .broadcastEvent()
  {
    expectError(client.broadcastEvent("my-room"));
    expectError(client.broadcastEvent("my-room", { date: Date }));

    // Arbitrary JSON will be errors
    expectError(client.broadcastEvent("my-room", 123));
    expectError(client.broadcastEvent("my-room", [1, 2, 3]));
    expectError(client.broadcastEvent("my-room", { type: "foo" }));
    expectError(client.broadcastEvent("my-room", { type: "boop" }));

    // Only correct room events can be sent
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
    expectType<readonly string[]>(root.animals);
    expectType<string>(root.person.name);
    expectType<number>(root.person.age);
    expectType<number | undefined>(root.scores["foo"]);
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

    // In an un-augmented world, this would be fine
    expectError(
      client.createThread({
        roomId: "my-room",
        data: {
          comment: {
            userId: "user-123",
            body: { version: 1, content: [] },
          },
        },
      })
    );

    // In an un-augmented world, this would be fine
    expectError(
      client.createThread({
        roomId: "my-room",
        data: {
          comment: {
            userId: "user-123",
            body: { version: 1, content: [] },
          },
          metadata: { foo: "bar" }, // Arbitrary metadata!
        },
      })
    );

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
    expectType<"red" | "blue">(thread.metadata.color);
    expectError(thread.metadata.nonexisting);
    expectType<CommentData[]>(thread.comments);

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

    expectType<"thread">(threadWithCommentMetadata.type);
    expectType<number>(
      threadWithCommentMetadata.comments[0]!.metadata.priority
    );
    expectType<boolean | undefined>(
      threadWithCommentMetadata.comments[0]!.metadata.reviewed
    );
    expectError(threadWithCommentMetadata.comments[0]!.metadata.nonexisting);
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

    // Incorrect metadata
    expectError(
      client.editThreadMetadata({
        roomId,
        threadId,
        data: { userId, metadata: { foo: "bar" } }, // Incorrect metadata
      })
    );

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

    expectError(
      client.editThreadMetadata({
        roomId,
        threadId,
        data: { userId, metadata: { color: null } }, // Color cannot be set to null
      })
    );

    expectError(
      client.editThreadMetadata({
        roomId,
        threadId,
        data: { userId, metadata: { foo: null } }, // Undefined fields
      })
    );
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
    expectType<Date>(thread.updatedAt);
    expectType<"red" | "blue">(thread.metadata.color);
    expectError(thread.metadata.nonexisting);
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

    expectType<"comment">(commentWithMetadata.type);
    expectType<number>(commentWithMetadata.metadata.priority);
    expectType<boolean | undefined>(commentWithMetadata.metadata.reviewed);
    expectError(commentWithMetadata.metadata.nonexisting);
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

    // Incorrect metadata
    expectError(
      client.editCommentMetadata({
        roomId,
        threadId,
        commentId,
        data: { userId, metadata: { foo: "bar" } }, // Incorrect metadata
      })
    );

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
      data: {
        userId,
        metadata: { priority: 2, reviewed: null },
      }, // Correct metadata updates
    });

    expectError(
      client.editCommentMetadata({
        roomId,
        threadId,
        commentId,
        data: { userId, metadata: { priority: null } }, // priority cannot be set to null
      })
    );

    expectError(
      client.editCommentMetadata({
        roomId,
        threadId,
        commentId,
        data: { userId, metadata: { foo: null } }, // Undefined fields
      })
    );
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
