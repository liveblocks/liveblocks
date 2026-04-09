import React from "react";
import type {
  BaseMetadata,
  NotificationSettings,
  Json,
  Lson,
} from "@liveblocks/client";
import { LiveObject, LiveList } from "@liveblocks/client";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import type { AiChatStatus } from "@liveblocks/react";
import { describe, expectTypeOf, test } from "vitest";

describe("without Liveblocks augmentation", () => {
  test("LiveblocksProvider", () => {
    {
      const LiveblocksProvider = classic.LiveblocksProvider;

      void (
        (
          // @ts-expect-error
          <LiveblocksProvider />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider throttle={16} />
        )
      );

      <LiveblocksProvider authEndpoint="/api/auth" />;
      <LiveblocksProvider publicApiKey="pk_xxx" />;
      <LiveblocksProvider authEndpoint="/api/auth" throttle={16} />;
      <LiveblocksProvider
        authEndpoint={async () => ({ token: "token" })}
        throttle={16}
      />;

      <LiveblocksProvider
        authEndpoint="/api/auth"
        resolveUsers={async () => [{ foo: "bar" }]}
      />;

      <LiveblocksProvider
        authEndpoint="/api/auth"
        resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
      />;

      <LiveblocksProvider authEndpoint="/api/auth" preventUnsavedChanges />;
    }
  });

  test("LiveblocksProvider (suspense)", () => {
    {
      const LiveblocksProvider = suspense.LiveblocksProvider;

      void (
        (
          // @ts-expect-error
          <LiveblocksProvider />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider throttle={16} />
        )
      );

      <LiveblocksProvider authEndpoint="/api/auth" />;
      <LiveblocksProvider publicApiKey="pk_xxx" />;
      <LiveblocksProvider authEndpoint="/api/auth" throttle={16} />;
      <LiveblocksProvider
        authEndpoint={async () => ({ token: "token" })}
        throttle={16}
      />;

      <LiveblocksProvider
        authEndpoint="/api/auth"
        resolveUsers={async () => [{ foo: "bar" }]}
      />;

      <LiveblocksProvider
        authEndpoint="/api/auth"
        resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
      />;

      <LiveblocksProvider authEndpoint="/api/auth" preventUnsavedChanges />;
    }
  });

  test("RoomProvider", () => {
    {
      const RoomProvider = classic.RoomProvider;

      // Missing mandatory room ID is an error
      void (
        (
          // @ts-expect-error
          <RoomProvider /* no room id */>
            <div />
          </RoomProvider>
        )
      );

      <RoomProvider id="my-room">
        <div />
      </RoomProvider>;

      <RoomProvider
        id="my-room"
        initialPresence={{ anything: ["is", "fine", "here"] }}
      >
        <div />
      </RoomProvider>;

      <RoomProvider
        id="my-room"
        initialStorage={{
          foo: new LiveList([]),
          bar: new LiveObject(),
        }}
      >
        <div />
      </RoomProvider>;

      <RoomProvider
        id="my-room"
        initialPresence={{ anything: ["is", "fine", "here"] }}
        initialStorage={{
          foo: new LiveList([]),
          bar: new LiveObject(),
        }}
      >
        <div />
      </RoomProvider>;
    }
  });

  test("RoomProvider (suspense)", () => {
    {
      const RoomProvider = suspense.RoomProvider;

      // Missing mandatory room ID is an error
      void (
        (
          // @ts-expect-error
          <RoomProvider /* no room id */>
            <div />
          </RoomProvider>
        )
      );

      <RoomProvider id="my-room">
        <div />
      </RoomProvider>;

      <RoomProvider
        id="my-room"
        initialPresence={{ anything: ["is", "fine", "here"] }}
      >
        <div />
      </RoomProvider>;

      <RoomProvider
        id="my-room"
        initialStorage={{
          foo: new LiveList([]),
          bar: new LiveObject(),
        }}
      >
        <div />
      </RoomProvider>;

      <RoomProvider
        id="my-room"
        initialPresence={{ anything: ["is", "fine", "here"] }}
        initialStorage={{
          foo: new LiveList([]),
          bar: new LiveObject(),
        }}
      >
        <div />
      </RoomProvider>;
    }
  });

  test("useRoom()", () => {
    {
      const room = classic.useRoom();
      expectTypeOf(room.getPresence().cursor).toEqualTypeOf<Json | undefined>();
      expectTypeOf(room.getPresence().nonexisting).toEqualTypeOf<
        Json | undefined
      >();

      expectTypeOf(
        classic.useRoom({ allowOutsideRoom: false }).id
      ).toEqualTypeOf<string>();
      expectTypeOf(
        classic.useRoom({ allowOutsideRoom: true })?.id
      ).toEqualTypeOf<string | undefined>();
      expectTypeOf(
        classic.useRoom({ allowOutsideRoom: Math.random() < 0.5 })?.id
      ).toEqualTypeOf<string | undefined>();
    }
  });

  test("useRoom() (suspense)", () => {
    {
      const room = suspense.useRoom();
      expectTypeOf(room.getPresence().cursor).toEqualTypeOf<Json | undefined>();
      expectTypeOf(room.getPresence().nonexisting).toEqualTypeOf<
        Json | undefined
      >();

      expectTypeOf(
        suspense.useRoom({ allowOutsideRoom: false }).id
      ).toEqualTypeOf<string>();
      expectTypeOf(
        suspense.useRoom({ allowOutsideRoom: true })?.id
      ).toEqualTypeOf<string | undefined>();
      expectTypeOf(
        suspense.useRoom({ allowOutsideRoom: Math.random() < 0.5 })?.id
      ).toEqualTypeOf<string | undefined>();
    }
  });

  test("useIsInsideRoom()", () => {
    {
      const isInsideRoom = classic.useIsInsideRoom();
      expectTypeOf(isInsideRoom).toEqualTypeOf<boolean>();
    }
  });

  test("useIsInsideRoom() (suspense)", () => {
    {
      const isInsideRoom = suspense.useIsInsideRoom();
      expectTypeOf(isInsideRoom).toEqualTypeOf<boolean>();
    }
  });

  test("useErrorListener()", () => {
    {
      classic.useErrorListener((err) => {
        expectTypeOf(err.message).toEqualTypeOf<string>();
        expectTypeOf(err.stack).toEqualTypeOf<string | undefined>();
        expectTypeOf(err.context.code).toEqualTypeOf<
          string | -1 | 4001 | 4005 | 4006 | (number & {}) | undefined
        >();
        expectTypeOf(err.context.type).toExtend<
          | "AI_CONNECTION_ERROR"
          | "ROOM_CONNECTION_ERROR"
          | "CREATE_THREAD_ERROR"
          | "DELETE_THREAD_ERROR"
          | "EDIT_THREAD_METADATA_ERROR"
          | "EDIT_COMMENT_METADATA_ERROR"
          | "MARK_THREAD_AS_RESOLVED_ERROR"
          | "MARK_THREAD_AS_UNRESOLVED_ERROR"
          | "SUBSCRIBE_TO_THREAD_ERROR"
          | "UNSUBSCRIBE_FROM_THREAD_ERROR"
          | "CREATE_COMMENT_ERROR"
          | "EDIT_COMMENT_ERROR"
          | "DELETE_COMMENT_ERROR"
          | "ADD_REACTION_ERROR"
          | "REMOVE_REACTION_ERROR"
          | "MARK_INBOX_NOTIFICATION_AS_READ_ERROR"
          | "DELETE_INBOX_NOTIFICATION_ERROR"
          | "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR"
          | "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR"
          | "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR"
          | "UPDATE_NOTIFICATION_SETTINGS_ERROR"
          | "LARGE_MESSAGE_ERROR"
          | "FEED_REQUEST_ERROR"
        >();
        if (err.context.type === "ROOM_CONNECTION_ERROR") {
          expectTypeOf(err.context.code).toExtend<number>();
          expectTypeOf(err.context.code).toExtend<number | undefined>();
        } else if (err.context.type === "CREATE_THREAD_ERROR") {
          expectTypeOf(err.context.roomId).toEqualTypeOf<string>();
          expectTypeOf(err.context.threadId).toEqualTypeOf<string>();
          expectTypeOf(err.context.commentId).toEqualTypeOf<string>();
        } else {
          // Not going to list them all...
        }
      });
    }
  });

  test("useErrorListener() (suspense)", () => {
    {
      suspense.useErrorListener((err) => {
        expectTypeOf(err.message).toEqualTypeOf<string>();
        expectTypeOf(err.stack).toEqualTypeOf<string | undefined>();
        expectTypeOf(err.context.code).toEqualTypeOf<
          string | -1 | 4001 | 4005 | 4006 | (number & {}) | undefined
        >();
        expectTypeOf(err.context.type).toExtend<
          | "AI_CONNECTION_ERROR"
          | "ROOM_CONNECTION_ERROR"
          | "CREATE_THREAD_ERROR"
          | "DELETE_THREAD_ERROR"
          | "EDIT_THREAD_METADATA_ERROR"
          | "EDIT_COMMENT_METADATA_ERROR"
          | "MARK_THREAD_AS_RESOLVED_ERROR"
          | "MARK_THREAD_AS_UNRESOLVED_ERROR"
          | "SUBSCRIBE_TO_THREAD_ERROR"
          | "UNSUBSCRIBE_FROM_THREAD_ERROR"
          | "CREATE_COMMENT_ERROR"
          | "EDIT_COMMENT_ERROR"
          | "DELETE_COMMENT_ERROR"
          | "ADD_REACTION_ERROR"
          | "REMOVE_REACTION_ERROR"
          | "MARK_INBOX_NOTIFICATION_AS_READ_ERROR"
          | "DELETE_INBOX_NOTIFICATION_ERROR"
          | "MARK_ALL_INBOX_NOTIFICATIONS_AS_READ_ERROR"
          | "DELETE_ALL_INBOX_NOTIFICATIONS_ERROR"
          | "UPDATE_ROOM_SUBSCRIPTION_SETTINGS_ERROR"
          | "UPDATE_NOTIFICATION_SETTINGS_ERROR"
          | "LARGE_MESSAGE_ERROR"
          | "FEED_REQUEST_ERROR"
        >();
        if (err.context.type === "ROOM_CONNECTION_ERROR") {
          expectTypeOf(err.context.code).toExtend<number>();
          expectTypeOf(err.context.code).toExtend<number | undefined>();
        } else if (err.context.type === "CREATE_THREAD_ERROR") {
          expectTypeOf(err.context.roomId).toEqualTypeOf<string>();
          expectTypeOf(err.context.threadId).toEqualTypeOf<string>();
          expectTypeOf(err.context.commentId).toEqualTypeOf<string>();
        } else {
          // Not going to list them all...
        }
      });
    }
  });

  test("useSelf()", () => {
    {
      const me = classic.useSelf();
      expectTypeOf(me?.presence.cursor).toEqualTypeOf<Json | undefined>();
      expectTypeOf(me?.presence.nonexisting).toEqualTypeOf<Json | undefined>();

      expectTypeOf(me?.info?.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(me?.info?.age).toEqualTypeOf<Json | undefined>();
      expectTypeOf(me?.info?.nonexisting).toEqualTypeOf<Json | undefined>();
    }
  });

  test("useSelf() (suspense)", () => {
    {
      const me = suspense.useSelf();
      expectTypeOf(me.presence.cursor).toEqualTypeOf<Json | undefined>();
      expectTypeOf(me.presence.nonexisting).toEqualTypeOf<Json | undefined>();

      expectTypeOf(me.info?.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(me.info?.age).toEqualTypeOf<Json | undefined>();
      expectTypeOf(me.info?.nonexisting).toEqualTypeOf<Json | undefined>();
    }
  });

  test("useSelf(selector)", () => {
    {
      const x = classic.useSelf((me) => me.presence.cursor);
      expectTypeOf(x).toEqualTypeOf<Json | undefined | null>();
    }
  });

  test("useSelf(selector) (suspense)", () => {
    {
      const x = suspense.useSelf((me) => me.presence.cursor);
      expectTypeOf(x).toEqualTypeOf<Json | undefined>();
    }
  });

  test("useOthers()", () => {
    {
      const others = classic.useOthers();
      expectTypeOf(others[13]!.presence.cursor).toEqualTypeOf<
        Json | undefined
      >();
      expectTypeOf(others[0]!.canWrite).toEqualTypeOf<boolean>();
    }
  });

  test("useOthers() (suspense)", () => {
    {
      const others = suspense.useOthers();
      expectTypeOf(others[13]!.presence.cursor).toEqualTypeOf<
        Json | undefined
      >();
      expectTypeOf(others[0]!.canWrite).toEqualTypeOf<boolean>();
    }
  });

  test("useOthers(selector)", () => {
    {
      const num = classic.useOthers((others) => others.length);
      expectTypeOf(num).toEqualTypeOf<number>();

      const xs = classic.useOthers((others) =>
        others.map((o) => o.presence.cursor)
      );
      expectTypeOf(xs).toEqualTypeOf<(Json | undefined)[]>();
    }
  });

  test("useOthers(selector) (suspense)", () => {
    {
      const num = classic.useOthers((others) => others.length);
      expectTypeOf(num).toEqualTypeOf<number>();

      const xs = classic.useOthers((others) =>
        others.map((o) => o.presence.cursor)
      );
      expectTypeOf(xs).toEqualTypeOf<(Json | undefined)[]>();
    }
  });

  test("useOthers(selector, eq)", () => {
    {
      const xs = classic.useOthers(
        (others) => others.map((o) => o.presence.cursor),
        classic.shallow
      );
      expectTypeOf(xs).toEqualTypeOf<(Json | undefined)[]>();
    }
  });

  test("useOthers(selector, eq) (suspense)", () => {
    {
      const xs = suspense.useOthers(
        (others) => others.map((o) => o.presence.cursor),
        suspense.shallow
      );
      expectTypeOf(xs).toEqualTypeOf<(Json | undefined)[]>();
    }
  });

  test("useMutation()", () => {
    {
      expectTypeOf(
        classic.useMutation((mut, _a: number, _b: boolean) => {
          expectTypeOf(mut.self.presence.cursor).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.self.presence.nonexisting).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.self.info!.name).toEqualTypeOf<string | undefined>();
          expectTypeOf(mut.self.info!.age).toEqualTypeOf<Json | undefined>();
          expectTypeOf(mut.self.info!.nonexisting).toEqualTypeOf<
            Json | undefined
          >();

          expectTypeOf(mut.others[0]!.presence.cursor).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.others[0]!.presence.nonexisting).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.others[0]!.info!.name).toEqualTypeOf<
            string | undefined
          >();
          expectTypeOf(mut.others[0]!.info!.age).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.others[0]!.info!.nonexisting).toEqualTypeOf<
            Json | undefined
          >();

          expectTypeOf(mut.storage.get("animals")).toEqualTypeOf<
            Lson | undefined
          >();
          expectTypeOf(mut.storage.get("nonexisting")).toEqualTypeOf<
            Lson | undefined
          >();
          expectTypeOf(
            mut.setMyPresence({ cursor: { x: 0, y: 0 } })
          ).toEqualTypeOf<void>();
          expectTypeOf(
            mut.setMyPresence({ nonexisting: 123 })
          ).toEqualTypeOf<void>();

          return "hi" as const;
        }, [])
      ).toEqualTypeOf<(a: number, b: boolean) => "hi">();
    }
  });

  test("useMutation() (suspense)", () => {
    {
      expectTypeOf(
        suspense.useMutation((mut, _a: number, _b: boolean) => {
          expectTypeOf(mut.self.presence.cursor).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.self.presence.nonexisting).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.self.info!.name).toEqualTypeOf<string | undefined>();
          expectTypeOf(mut.self.info!.age).toEqualTypeOf<Json | undefined>();
          expectTypeOf(mut.self.info!.nonexisting).toEqualTypeOf<
            Json | undefined
          >();

          expectTypeOf(mut.others[0]!.presence.cursor).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.others[0]!.presence.nonexisting).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.others[0]!.info!.name).toEqualTypeOf<
            string | undefined
          >();
          expectTypeOf(mut.others[0]!.info!.age).toEqualTypeOf<
            Json | undefined
          >();
          expectTypeOf(mut.others[0]!.info!.nonexisting).toEqualTypeOf<
            Json | undefined
          >();

          expectTypeOf(mut.storage.get("animals")).toEqualTypeOf<
            Lson | undefined
          >();
          expectTypeOf(mut.storage.get("nonexisting")).toEqualTypeOf<
            Lson | undefined
          >();
          expectTypeOf(
            mut.setMyPresence({ cursor: { x: 0, y: 0 } })
          ).toEqualTypeOf<void>();
          expectTypeOf(
            mut.setMyPresence({ nonexisting: 123 })
          ).toEqualTypeOf<void>();

          return "hi" as const;
        }, [])
      ).toEqualTypeOf<(a: number, b: boolean) => "hi">();
    }
  });

  test("useBroadcastEvent()", () => {
    {
      const broadcast = classic.useBroadcastEvent();
      broadcast({ type: "emoji", emoji: "😍" });
      broadcast({ type: "left", userId: "1234" });
      broadcast({ a: [], b: "", c: 123, d: false, e: undefined, f: null }); // arbitrary JSON
      // @ts-expect-error
      void broadcast({ notSerializable: new Date() });
      // @ts-expect-error
      void broadcast(new Date());
    }
  });

  test("useBroadcastEvent() (suspense)", () => {
    {
      const broadcast = suspense.useBroadcastEvent();
      broadcast({ type: "emoji", emoji: "😍" });
      broadcast({ type: "left", userId: "1234" });
      broadcast({ a: [], b: "", c: 123, d: false, e: undefined, f: null }); // arbitrary JSON
      // @ts-expect-error
      void broadcast({ notSerializable: new Date() });
      // @ts-expect-error
      void broadcast(new Date());
    }
  });

  test("useUser()", () => {
    {
      const { user, error, isLoading } = classic.useUser("user-id");
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(user?.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(user?.avatar).toEqualTypeOf<string | undefined>();
      expectTypeOf(user?.age).toEqualTypeOf<Json | undefined>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useUser() (suspense)", () => {
    {
      const { user, error, isLoading } = suspense.useUser("user-id");
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(user?.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(user?.avatar).toEqualTypeOf<string | undefined>();
      expectTypeOf(user?.age).toEqualTypeOf<Json | undefined>();
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useRoomInfo()", () => {
    {
      const { info, error, isLoading } = classic.useRoomInfo("room-id");
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(info?.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.url).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useRoomInfo() (suspense)", () => {
    {
      const { info, error, isLoading } = suspense.useRoomInfo("room-id");
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(info.url).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useGroupInfo()", () => {
    {
      const { info, error, isLoading } = classic.useGroupInfo("group-id");
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(info?.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.avatar).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useGroupInfo() (suspense)", () => {
    {
      const { info, error, isLoading } = suspense.useGroupInfo("group-id");
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(info.avatar).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useCreateThread()", () => {
    {
      const createThread = classic.useCreateThread();
      // @ts-expect-error
      void createThread({});

      const thread1 = createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
      });

      expectTypeOf(thread1.type).toEqualTypeOf<"thread">();
      expectTypeOf(thread1.id).toEqualTypeOf<string>();
      expectTypeOf(thread1.roomId).toEqualTypeOf<string>();
      expectTypeOf(thread1.comments[0]!.type).toEqualTypeOf<"comment">();
      expectTypeOf(thread1.comments[0]!.id).toEqualTypeOf<string>();
      expectTypeOf(thread1.comments[0]!.threadId).toEqualTypeOf<string>();

      expectTypeOf(thread1.metadata.color).toEqualTypeOf<
        string | number | boolean | undefined
      >();

      const thread2 = createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
        metadata: { foo: "bar" },
      });

      expectTypeOf(thread2.id).toEqualTypeOf<string>();
      expectTypeOf(thread2.metadata.foo).toEqualTypeOf<
        string | number | boolean | undefined
      >();
      expectTypeOf(thread2.metadata.nonexisting).toEqualTypeOf<
        string | number | boolean | undefined
      >();
    }
  });

  test("useCreateThread() (suspense)", () => {
    {
      const createThread = suspense.useCreateThread();
      // @ts-expect-error
      void createThread({});

      const thread1 = createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
      });

      expectTypeOf(thread1.type).toEqualTypeOf<"thread">();
      expectTypeOf(thread1.id).toEqualTypeOf<string>();
      expectTypeOf(thread1.roomId).toEqualTypeOf<string>();
      expectTypeOf(thread1.comments[0]!.type).toEqualTypeOf<"comment">();
      expectTypeOf(thread1.comments[0]!.id).toEqualTypeOf<string>();
      expectTypeOf(thread1.comments[0]!.threadId).toEqualTypeOf<string>();

      expectTypeOf(thread1.metadata.foo).toEqualTypeOf<
        string | number | boolean | undefined
      >();

      const thread2 = createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
        metadata: { foo: "bar" },
      });

      expectTypeOf(thread2.id).toEqualTypeOf<string>();
      expectTypeOf(thread2.metadata.foo).toEqualTypeOf<
        string | number | boolean | undefined
      >();
      expectTypeOf(thread2.metadata.nonexisting).toEqualTypeOf<
        string | number | boolean | undefined
      >();
    }
  });

  test("useEditThreadMetadata()", () => {
    {
      const editMetadata = classic.useEditThreadMetadata();
      // @ts-expect-error
      void editMetadata({});

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
      ).toEqualTypeOf<void>();
    }
  });

  test("useEditThreadMetadata() (suspense)", () => {
    {
      //        ---------------------
      const editMetadata = suspense.useEditThreadMetadata();
      // @ts-expect-error
      void editMetadata({}); // no body = error

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
      ).toEqualTypeOf<void>();

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: { color: null } })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: { color: "red" } })
      ).toEqualTypeOf<void>();
    }
  });

  test("useCreateComment()", () => {
    {
      {
        const createComment = classic.useCreateComment();
        // @ts-expect-error
        void createComment({});

        const comment = createComment({
          threadId: "th_xxx",
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "hi" }] }],
          },
        });

        expectTypeOf(comment.type).toEqualTypeOf<"comment">();
        expectTypeOf(comment.id).toEqualTypeOf<string>();
        expectTypeOf(comment.threadId).toEqualTypeOf<string>();
        expectTypeOf(comment.metadata.foo).toEqualTypeOf<
          string | number | boolean | undefined
        >();

        const commentWithMetadata = createComment({
          threadId: "th_xxx",
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "hi" }] }],
          },
          metadata: { status: "pending", priority: 1 },
        });

        expectTypeOf(commentWithMetadata.type).toEqualTypeOf<"comment">();
        expectTypeOf(commentWithMetadata.metadata.status).toEqualTypeOf<
          string | number | boolean | undefined
        >();
        expectTypeOf(commentWithMetadata.metadata.priority).toEqualTypeOf<
          string | number | boolean | undefined
        >();
      }
    }
  });

  test("useCreateComment() (suspense)", () => {
    {
      const createComment = suspense.useCreateComment();
      // @ts-expect-error
      void createComment({});

      const comment = createComment({
        threadId: "th_xxx",
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
      });

      expectTypeOf(comment.type).toEqualTypeOf<"comment">();
      expectTypeOf(comment.id).toEqualTypeOf<string>();
      expectTypeOf(comment.threadId).toEqualTypeOf<string>();
      expectTypeOf(comment.metadata.foo).toEqualTypeOf<
        string | number | boolean | undefined
      >();

      const commentWithMetadata = createComment({
        threadId: "th_xxx",
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
        metadata: { priority: 2 },
      });

      expectTypeOf(commentWithMetadata.type).toEqualTypeOf<"comment">();
      expectTypeOf(commentWithMetadata.metadata.status).toEqualTypeOf<
        string | number | boolean | undefined
      >();
    }
  });

  test("useEditComment()", () => {
    {
      const editComment = classic.useEditComment();
      // @ts-expect-error
      void editComment({});

      expectTypeOf(
        editComment({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          body: { version: 1, content: [] },
        })
      ).toEqualTypeOf<void>();

      expectTypeOf(
        editComment({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          body: { version: 1, content: [] },
          metadata: { priority: 2 },
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useEditComment() (suspense)", () => {
    {
      const editComment = suspense.useEditComment();
      // @ts-expect-error
      void editComment({});

      expectTypeOf(
        editComment({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          body: { version: 1, content: [] },
        })
      ).toEqualTypeOf<void>();

      expectTypeOf(
        editComment({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          body: { version: 1, content: [] },
          metadata: { priority: 2 },
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useEditCommentMetadata()", () => {
    {
      const editMetadata = classic.useEditCommentMetadata();
      // @ts-expect-error
      void editMetadata({});

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", commentId: "cm_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          metadata: { nonexisting: 123 },
        })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          metadata: { nonexisting: null },
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useEditCommentMetadata() (suspense)", () => {
    {
      const editMetadata = suspense.useEditCommentMetadata();
      // @ts-expect-error
      void editMetadata({});

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", commentId: "cm_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          metadata: { nonexisting: null },
        })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          metadata: { nonexisting: 123 },
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useDeleteComment()", () => {
    {
      const deleteComment = classic.useDeleteComment();

      // @ts-expect-error
      void deleteComment({});
      // @ts-expect-error
      void deleteComment({ threadId: "th_xxx" });
      // @ts-expect-error
      void deleteComment({ commentId: "co_xxx" });

      expectTypeOf(
        deleteComment({ threadId: "th_xxx", commentId: "co_xxx" })
      ).toEqualTypeOf<void>();
    }
  });

  test("useDeleteComment() (suspense)", () => {
    {
      const deleteComment = suspense.useDeleteComment();

      // @ts-expect-error
      void deleteComment({});
      // @ts-expect-error
      void deleteComment({ threadId: "th_xxx" });
      // @ts-expect-error
      void deleteComment({ commentId: "co_xxx" });

      expectTypeOf(
        deleteComment({ threadId: "th_xxx", commentId: "co_xxx" })
      ).toEqualTypeOf<void>();
    }
  });

  test("useAddReaction()", () => {
    {
      const addReaction = classic.useAddReaction();

      // @ts-expect-error
      void addReaction({});
      // @ts-expect-error
      void addReaction({ threadId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void addReaction({ commentId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void addReaction({ threadId: "th_xxx", commentId: "th_xxx" });

      expectTypeOf(
        addReaction({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          emoji: "👍",
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useAddReaction() (suspense)", () => {
    {
      const addReaction = suspense.useAddReaction();

      // @ts-expect-error
      void addReaction({});
      // @ts-expect-error
      void addReaction({ threadId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void addReaction({ commentId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void addReaction({ threadId: "th_xxx", commentId: "th_xxx" });

      expectTypeOf(
        addReaction({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          emoji: "👍",
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useRemoveReaction()", () => {
    {
      const removeReaction = classic.useRemoveReaction();

      // @ts-expect-error
      void removeReaction({});
      // @ts-expect-error
      void removeReaction({ threadId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void removeReaction({ commentId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void removeReaction({ threadId: "th_xxx", commentId: "th_xxx" });

      expectTypeOf(
        removeReaction({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          emoji: "👍",
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useRemoveReaction() (suspense)", () => {
    {
      const removeReaction = suspense.useRemoveReaction();

      // @ts-expect-error
      void removeReaction({});
      // @ts-expect-error
      void removeReaction({ threadId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void removeReaction({ commentId: "th_xxx", emoji: "👍" });
      // @ts-expect-error
      void removeReaction({ threadId: "th_xxx", commentId: "th_xxx" });

      expectTypeOf(
        removeReaction({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          emoji: "👍",
        })
      ).toEqualTypeOf<void>();
    }
  });

  test("useInboxNotifications()", () => {
    {
      expectTypeOf(
        classic.useInboxNotifications().isLoading
      ).toEqualTypeOf<boolean>();
      expectTypeOf(classic.useInboxNotifications().error).toEqualTypeOf<
        Error | undefined
      >();
      expectTypeOf(
        classic
          .useInboxNotifications()
          .inboxNotifications?.map((ibn) => ibn.kind)
      ).toEqualTypeOf<
        ("thread" | "textMention" | `$${string}`)[] | undefined
      >();
      expectTypeOf(
        classic
          .useInboxNotifications()
          .inboxNotifications?.map((ibn) => ibn.roomId)
      ).toEqualTypeOf<(string | undefined)[] | undefined>();
    }
  });

  test("useInboxNotifications() (suspense)", () => {
    {
      expectTypeOf(
        suspense.useInboxNotifications().isLoading
      ).toEqualTypeOf<false>();
      expectTypeOf(
        suspense.useInboxNotifications().error
      ).toEqualTypeOf<undefined>();
      expectTypeOf(
        suspense
          .useInboxNotifications()
          .inboxNotifications?.map((ibn) => ibn.kind)
      ).toEqualTypeOf<("thread" | "textMention" | `$${string}`)[]>();
      expectTypeOf(
        suspense
          .useInboxNotifications()
          .inboxNotifications?.map((ibn) => ibn.roomId)
      ).toEqualTypeOf<(string | undefined)[]>();
    }
  });

  test("useInboxNotificationThread()", () => {
    {
      const result = classic.useInboxNotificationThread("in_xxx");
      expectTypeOf(result.type).toEqualTypeOf<"thread">();
      expectTypeOf(result.roomId).toEqualTypeOf<string>();
      expectTypeOf(result.comments).toExtend<unknown[]>();
      expectTypeOf(result.metadata).toEqualTypeOf<BaseMetadata>();
      expectTypeOf(result.metadata.color).toEqualTypeOf<
        string | number | boolean | undefined
      >();
      expectTypeOf(result.metadata.nonexisting).toEqualTypeOf<
        string | number | boolean | undefined
      >();
    }
  });

  test("useInboxNotificationThread() (suspense)", () => {
    {
      const result = suspense.useInboxNotificationThread("in_xxx");
      expectTypeOf(result.type).toEqualTypeOf<"thread">();
      expectTypeOf(result.roomId).toEqualTypeOf<string>();
      expectTypeOf(result.comments).toExtend<unknown[]>();
      expectTypeOf(result.metadata).toEqualTypeOf<BaseMetadata>();
      expectTypeOf(result.metadata.color).toEqualTypeOf<
        string | number | boolean | undefined
      >();
      expectTypeOf(result.metadata.nonexisting).toEqualTypeOf<
        string | number | boolean | undefined
      >();
    }
  });

  test("useMarkInboxNotificationAsRead()", () => {
    {
      const markRead = classic.useMarkInboxNotificationAsRead();
      expectTypeOf(markRead("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useMarkInboxNotificationAsRead() (suspense)", () => {
    {
      const markRead = suspense.useMarkInboxNotificationAsRead();
      expectTypeOf(markRead("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useMarkAllInboxNotificationsAsRead()", () => {
    {
      const markAllRead = classic.useMarkAllInboxNotificationsAsRead();
      expectTypeOf(markAllRead()).toEqualTypeOf<void>();
    }
  });

  test("useMarkAllInboxNotificationsAsRead() (suspense)", () => {
    {
      const markAllRead = suspense.useMarkAllInboxNotificationsAsRead();
      expectTypeOf(markAllRead()).toEqualTypeOf<void>();
    }
  });

  test("useDeleteInboxNotification()", () => {
    {
      const deleteNotification = classic.useDeleteInboxNotification();
      expectTypeOf(deleteNotification("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useDeleteInboxNotification() (suspense)", () => {
    {
      const deleteNotification = suspense.useDeleteInboxNotification();
      expectTypeOf(deleteNotification("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useDeleteAllInboxNotifications()", () => {
    {
      const deleteAllNotifications = classic.useDeleteAllInboxNotifications();
      expectTypeOf(deleteAllNotifications()).toEqualTypeOf<void>();
    }
  });

  test("useDeleteAllInboxNotifications() (suspense)", () => {
    {
      const deleteAllNotifications = suspense.useDeleteAllInboxNotifications();
      expectTypeOf(deleteAllNotifications()).toEqualTypeOf<void>();
    }
  });

  test("useUnreadInboxNotificationsCount()", () => {
    {
      const { count, error, isLoading } =
        classic.useUnreadInboxNotificationsCount();
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(count).toEqualTypeOf<number | undefined>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useUnreadInboxNotificationsCount() (suspense)", () => {
    {
      const { count, error, isLoading } =
        suspense.useUnreadInboxNotificationsCount();
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(count).toEqualTypeOf<number>();
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useSyncStatus()", () => {
    {
      const status = classic.useSyncStatus();
      expectTypeOf(status).toEqualTypeOf<"synchronizing" | "synchronized">();
    }
    {
      const status = suspense.useSyncStatus();
      expectTypeOf(status).toEqualTypeOf<"synchronizing" | "synchronized">();
    }
  });

  test("useNotificationSettings()", () => {
    {
      const [{ isLoading, error, settings }, update] =
        classic.useNotificationSettings();
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      expectTypeOf(settings).toEqualTypeOf<NotificationSettings | undefined>();
      expectTypeOf(update({})).toEqualTypeOf<void>(); // empty {} because of partial definition
    }
  });

  test("useNotificationSettings() (suspense)", () => {
    {
      const [{ isLoading, error, settings }, update] =
        suspense.useNotificationSettings();
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(error).toEqualTypeOf<undefined>();
      expectTypeOf(settings).toEqualTypeOf<NotificationSettings>();
      expectTypeOf(update({})).toEqualTypeOf<void>(); // empty {} because of partial definition
    }
  });

  test("useAiChatStatus()", () => {
    {
      const status = classic.useAiChatStatus("chat-123");
      expectTypeOf(status).toEqualTypeOf<AiChatStatus>();

      if (status.status === "generating") {
        expectTypeOf(status.status).toEqualTypeOf<"generating">();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.partType).toEqualTypeOf<"tool-invocation">();
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.partType).toEqualTypeOf<
            "text" | "reasoning" | "retrieval" | "sources" | undefined
          >();
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.status).toEqualTypeOf<
          "disconnected" | "loading" | "idle"
        >();
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useAiChatStatus() (suspense)", () => {
    {
      const status = suspense.useAiChatStatus("chat-123");
      expectTypeOf(status).toEqualTypeOf<AiChatStatus>();
      if (status.status === "generating") {
        expectTypeOf(status.status).toEqualTypeOf<"generating">();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.partType).toEqualTypeOf<"tool-invocation">();
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.partType).toEqualTypeOf<
            "text" | "reasoning" | "retrieval" | "sources" | undefined
          >();
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.status).toEqualTypeOf<
          "disconnected" | "loading" | "idle"
        >();
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useAiChatStatus() with branchId parameter", () => {
    {
      const status = classic.useAiChatStatus("chat-123", "ms_branch" as any);
      if (status.status === "generating") {
        expectTypeOf(status.status).toEqualTypeOf<"generating">();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.partType).toEqualTypeOf<"tool-invocation">();
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.partType).toEqualTypeOf<
            "text" | "reasoning" | "retrieval" | "sources" | undefined
          >();
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.status).toEqualTypeOf<
          "disconnected" | "loading" | "idle"
        >();
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useAiChatStatus() with branchId parameter (suspense)", () => {
    {
      const status = suspense.useAiChatStatus("chat-123", "ms_branch" as any);
      if (status.status === "generating") {
        expectTypeOf(status.status).toEqualTypeOf<"generating">();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.partType).toEqualTypeOf<"tool-invocation">();
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.partType).toEqualTypeOf<
            "text" | "reasoning" | "retrieval" | "sources" | undefined
          >();
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.status).toEqualTypeOf<
          "disconnected" | "loading" | "idle"
        >();
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });
});

