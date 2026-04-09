import React from "react";
import type { NotificationSettings } from "@liveblocks/core";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { describe, expectTypeOf, test } from "vitest";

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

describe("with Liveblocks augmentation", () => {
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

      void (
        <LiveblocksProvider
          authEndpoint="/api/auth"
          // @ts-expect-error
          resolveUsers={async () => [{ foo: "bar" }]}
        />
      );

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

      void (
        <LiveblocksProvider
          authEndpoint="/api/auth"
          // @ts-expect-error
          resolveUsers={async () => [{ foo: "bar" }]}
        />
      );

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

      // Missing mandatory props is an error
      void (
        (
          // @ts-expect-error
          <RoomProvider /* no room id */>
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing initialPresence
          <RoomProvider id="my-room">
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialStorage
          <RoomProvider
            id="my-room"
            initialPresence={{ cursor: { x: 0, y: 0 } }}
          >
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialPresence
          <RoomProvider
            id="my-room"
            initialStorage={{
              animals: new LiveList([]),
              person: new LiveObject(),
              scores: new LiveMap(),
            }}
          >
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialStorage
          <RoomProvider
            id="my-room"
            initialPresence={{ cursor: { x: 0, y: 0 } }}
          >
            <div />
          </RoomProvider>
        )
      );

      void (
        <RoomProvider
          id="my-room"
          initialPresence={{ cursor: { x: 0, y: 0 } }}
          initialStorage={{
            // Incorrect storage shape
            // @ts-expect-error
            foo: new LiveList([]),
            bar: new LiveObject(),
          }}
        >
          <div />
        </RoomProvider>
      );

      <RoomProvider
        id="my-room"
        initialPresence={{ cursor: { x: 0, y: 0 } }}
        initialStorage={{
          animals: new LiveList([]),
          person: new LiveObject(),
          scores: new LiveMap(),
        }}
      >
        <div />
      </RoomProvider>;
    }
  });

  test("RoomProvider (suspense)", () => {
    {
      const RoomProvider = suspense.RoomProvider;

      // Missing mandatory props is an error
      void (
        (
          // @ts-expect-error
          <RoomProvider /* no room id */>
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing initialPresence
          <RoomProvider id="my-room">
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialStorage
          <RoomProvider
            id="my-room"
            initialPresence={{ cursor: { x: 0, y: 0 } }}
          >
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialPresence
          <RoomProvider
            id="my-room"
            initialStorage={{
              animals: new LiveList([]),
              person: new LiveObject(),
              scores: new LiveMap(),
            }}
          >
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialStorage
          <RoomProvider
            id="my-room"
            initialPresence={{ cursor: { x: 0, y: 0 } }}
          >
            <div />
          </RoomProvider>
        )
      );

      void (
        <RoomProvider
          id="my-room"
          initialPresence={{ cursor: { x: 0, y: 0 } }}
          initialStorage={{
            // Incorrect storage shape
            // @ts-expect-error
            foo: new LiveList([]),
            bar: new LiveObject(),
          }}
        >
          <div />
        </RoomProvider>
      );

      <RoomProvider
        id="my-room"
        initialPresence={{ cursor: { x: 0, y: 0 } }}
        initialStorage={{
          animals: new LiveList([]),
          person: new LiveObject(),
          scores: new LiveMap(),
        }}
      >
        <div />
      </RoomProvider>;
    }
  });

  test("useRoom()", () => {
    {
      const room = classic.useRoom();
      expectTypeOf(room.getPresence().cursor.x).toEqualTypeOf<number>();
      expectTypeOf(room.getPresence().cursor.y).toEqualTypeOf<number>();
      // @ts-expect-error
      void room.getPresence().nonexisting;

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
      expectTypeOf(room.getPresence().cursor.x).toEqualTypeOf<number>();
      expectTypeOf(room.getPresence().cursor.y).toEqualTypeOf<number>();
      // @ts-expect-error
      void room.getPresence().nonexisting;

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
      expectTypeOf(me?.presence.cursor.x).toEqualTypeOf<number | undefined>();
      expectTypeOf(me?.presence.cursor.y).toEqualTypeOf<number | undefined>();
      // @ts-expect-error
      void me?.presence.nonexisting;

      expectTypeOf(me?.info.name).toEqualTypeOf<string | undefined>();
      expectTypeOf(me?.info.age).toEqualTypeOf<number | undefined>();
      // @ts-expect-error
      void me?.info.nonexisting;
    }
  });

  test("useSelf() (suspense)", () => {
    {
      const me = suspense.useSelf();
      expectTypeOf(me.presence.cursor.x).toEqualTypeOf<number>();
      expectTypeOf(me.presence.cursor.y).toEqualTypeOf<number>();
      // @ts-expect-error
      void me.presence.nonexisting;

      expectTypeOf(me.info.name).toEqualTypeOf<string>();
      expectTypeOf(me.info.age).toEqualTypeOf<number>();
      // @ts-expect-error
      void me.info.nonexisting;
    }
  });

  test("useSelf(selector)", () => {
    {
      const x = classic.useSelf((me) => me.presence.cursor.x);
      expectTypeOf(x).toEqualTypeOf<number | null>();
    }
  });

  test("useSelf(selector) (suspense)", () => {
    {
      const x = suspense.useSelf((me) => me.presence.cursor.x);
      expectTypeOf(x).toEqualTypeOf<number>();
    }
  });

  test("useOthers()", () => {
    {
      const others = classic.useOthers();
      expectTypeOf(others[13]!.presence.cursor.x).toEqualTypeOf<number>();
      expectTypeOf(others[42]!.presence.cursor.y).toEqualTypeOf<number>();
      expectTypeOf(others[0]!.canWrite).toEqualTypeOf<boolean>();
    }
  });

  test("useOthers() (suspense)", () => {
    {
      const others = suspense.useOthers();
      expectTypeOf(others[13]!.presence.cursor.x).toEqualTypeOf<number>();
      expectTypeOf(others[42]!.presence.cursor.y).toEqualTypeOf<number>();
      expectTypeOf(others[0]!.canWrite).toEqualTypeOf<boolean>();
    }
  });

  test("useOthers(selector)", () => {
    {
      const num = classic.useOthers((others) => others.length);
      expectTypeOf(num).toEqualTypeOf<number>();

      const xs = classic.useOthers((others) =>
        others.map((o) => o.presence.cursor.x)
      );
      expectTypeOf(xs).toEqualTypeOf<number[]>();
    }
  });

  test("useOthers(selector) (suspense)", () => {
    {
      const num = classic.useOthers((others) => others.length);
      expectTypeOf(num).toEqualTypeOf<number>();

      const xs = classic.useOthers((others) =>
        others.map((o) => o.presence.cursor.x)
      );
      expectTypeOf(xs).toEqualTypeOf<number[]>();
    }
  });

  test("useOthers(selector, eq)", () => {
    {
      const xs = classic.useOthers(
        (others) => others.map((o) => o.presence.cursor.x),
        classic.shallow
      );
      expectTypeOf(xs).toEqualTypeOf<number[]>();
    }
  });

  test("useOthers(selector, eq) (suspense)", () => {
    {
      const xs = suspense.useOthers(
        (others) => others.map((o) => o.presence.cursor.x),
        suspense.shallow
      );
      expectTypeOf(xs).toEqualTypeOf<number[]>();
    }
  });

  test("useMutation()", () => {
    {
      expectTypeOf(
        classic.useMutation((mut, _a: number, _b: boolean) => {
          expectTypeOf(mut.self.presence.cursor.x).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.self.presence.nonexisting;
          expectTypeOf(mut.self.info.name).toEqualTypeOf<string>();
          expectTypeOf(mut.self.info.age).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.self.info.nonexisting;

          expectTypeOf(
            mut.others[0]!.presence.cursor.x
          ).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.others[0]!.presence.nonexisting;
          expectTypeOf(mut.others[0]!.info.name).toEqualTypeOf<string>();
          expectTypeOf(mut.others[0]!.info.age).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.others[0]!.info.nonexisting;

          expectTypeOf(mut.storage.get("animals").get(0)).toEqualTypeOf<
            string | undefined
          >();
          expectTypeOf(mut.storage.get("scores").get("one")).toEqualTypeOf<
            number | undefined
          >();
          expectTypeOf(
            mut.storage.get("person").get("age")
          ).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.storage.get("nonexisting");
          expectTypeOf(
            mut.setMyPresence({ cursor: { x: 0, y: 0 } })
          ).toEqualTypeOf<void>();
          // @ts-expect-error
          void mut.setMyPresence({ nonexisting: 123 });

          return "hi" as const;
        }, [])
      ).toEqualTypeOf<(a: number, b: boolean) => "hi">();
    }
  });

  test("useMutation() (suspense)", () => {
    {
      expectTypeOf(
        suspense.useMutation((mut, _a: number, _b: boolean) => {
          expectTypeOf(mut.self.presence.cursor.x).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.self.presence.nonexisting;
          expectTypeOf(mut.self.info.name).toEqualTypeOf<string>();
          expectTypeOf(mut.self.info.age).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.self.info.nonexisting;

          expectTypeOf(
            mut.others[0]!.presence.cursor.x
          ).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.others[0]!.presence.nonexisting;
          expectTypeOf(mut.others[0]!.info.name).toEqualTypeOf<string>();
          expectTypeOf(mut.others[0]!.info.age).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.others[0]!.info.nonexisting;

          expectTypeOf(mut.storage.get("animals").get(0)).toEqualTypeOf<
            string | undefined
          >();
          expectTypeOf(mut.storage.get("scores").get("one")).toEqualTypeOf<
            number | undefined
          >();
          expectTypeOf(
            mut.storage.get("person").get("age")
          ).toEqualTypeOf<number>();
          // @ts-expect-error
          void mut.storage.get("nonexisting");
          expectTypeOf(
            mut.setMyPresence({ cursor: { x: 0, y: 0 } })
          ).toEqualTypeOf<void>();
          // @ts-expect-error
          void mut.setMyPresence({ nonexisting: 123 });

          return "hi" as const;
        }, [])
      ).toEqualTypeOf<(a: number, b: boolean) => "hi">();
    }
  });

  test("useBroadcastEvent()", () => {
    {
      const broadcast = classic.useBroadcastEvent();
      broadcast({ type: "emoji", emoji: "😍" });
      broadcast({ type: "beep", times: 3 });
      broadcast({ type: "beep" });
      // broadcast({ type: "leave", userId: "1234" });  // TODO Allow this using union types
      // @ts-expect-error
      void broadcast({ type: "i-do-not-exist" });
      // @ts-expect-error
      void broadcast(new Date());
    }
  });

  test("useBroadcastEvent() (suspense)", () => {
    {
      const broadcast = suspense.useBroadcastEvent();
      broadcast({ type: "emoji", emoji: "😍" });
      broadcast({ type: "beep", times: 3 });
      broadcast({ type: "beep" });
      // broadcast({ type: "leave", userId: "1234" });  // TODO Allow this using union types
      // @ts-expect-error
      void broadcast({ type: "i-do-not-exist" });
      // @ts-expect-error
      void broadcast(new Date());
    }
  });

  test("useUser()", () => {
    {
      const { user, error, isLoading } = classic.useUser("user-id");
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(user!.name).toEqualTypeOf<string>();
      // @ts-expect-error
      void user?.avatar;
      expectTypeOf(user!.age).toEqualTypeOf<number>();
      // @ts-expect-error
      void user?.anyOtherProp;
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useUser() (suspense)", () => {
    {
      const { user, error, isLoading } = suspense.useUser("user-id");
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(user.name).toEqualTypeOf<string>();
      // @ts-expect-error
      void user.avatar;
      expectTypeOf(user.age).toEqualTypeOf<number>();
      // @ts-expect-error
      void user.anyOtherProp;
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useRoomInfo()", () => {
    {
      const { info, error, isLoading } = classic.useRoomInfo("room-id");
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(info!.name).toEqualTypeOf<string>();
      expectTypeOf(info!.url).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.type).toEqualTypeOf<
        "public" | "private" | undefined
      >();
      // @ts-expect-error
      void info?.nonexisting;
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useRoomInfo() (suspense)", () => {
    {
      const { info, error, isLoading } = suspense.useRoomInfo("room-id");
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(info.name).toEqualTypeOf<string>();
      expectTypeOf(info.url).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.type).toEqualTypeOf<"public" | "private">();
      // @ts-expect-error
      void info?.nonexisting;
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useGroupInfo()", () => {
    {
      const { info, error, isLoading } = classic.useGroupInfo("group-id");
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(info!.name).toEqualTypeOf<string>();
      expectTypeOf(info!.avatar).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.type).toEqualTypeOf<"open" | "closed" | undefined>();
      // @ts-expect-error
      void info?.nonexisting;
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useGroupInfo() (suspense)", () => {
    {
      const { info, error, isLoading } = suspense.useGroupInfo("group-id");
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(info.name).toEqualTypeOf<string>();
      expectTypeOf(info.avatar).toEqualTypeOf<string | undefined>();
      expectTypeOf(info?.type).toEqualTypeOf<"open" | "closed">();
      // @ts-expect-error
      void info?.nonexisting;
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useCreateThread()", () => {
    {
      const createThread = classic.useCreateThread();
      // @ts-expect-error
      void createThread({}); // no body = error

      // No metadata = error
      void (
        // @ts-expect-error
        createThread({
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "hi" }] }],
          },
        })
      );

      const thread = createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
        metadata: { color: "red" },
        commentMetadata: { priority: 1 },
      });

      expectTypeOf(thread.type).toEqualTypeOf<"thread">();
      expectTypeOf(thread.id).toEqualTypeOf<string>();
      expectTypeOf(thread.roomId).toEqualTypeOf<string>();
      expectTypeOf(thread.comments[0]!.type).toEqualTypeOf<"comment">();
      expectTypeOf(thread.comments[0]!.id).toEqualTypeOf<string>();
      expectTypeOf(thread.comments[0]!.threadId).toEqualTypeOf<string>();

      expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
      // @ts-expect-error
      void thread.metadata.nonexisting;
    }
  });

  test("useCreateThread() (suspense)", () => {
    {
      const createThread = suspense.useCreateThread();
      // @ts-expect-error
      void createThread({}); // no body = error

      // No metadata = error
      void (
        // @ts-expect-error
        createThread({
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "hi" }] }],
          },
        })
      );

      const thread = createThread({
        body: {
          version: 1,
          content: [{ type: "paragraph", children: [{ text: "hi" }] }],
        },
        metadata: { color: "red" },
        commentMetadata: { priority: 1 },
      });

      expectTypeOf(thread.type).toEqualTypeOf<"thread">();
      expectTypeOf(thread.id).toEqualTypeOf<string>();
      expectTypeOf(thread.roomId).toEqualTypeOf<string>();
      expectTypeOf(thread.comments[0]!.type).toEqualTypeOf<"comment">();
      expectTypeOf(thread.comments[0]!.id).toEqualTypeOf<string>();
      expectTypeOf(thread.comments[0]!.threadId).toEqualTypeOf<string>();

      expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
      // @ts-expect-error
      void thread.metadata.nonexisting;
    }
  });

  test("useEditThreadMetadata()", () => {
    {
      const editMetadata = classic.useEditThreadMetadata();
      // @ts-expect-error
      void editMetadata({}); // no body = error

      void editMetadata({
        threadId: "th_xxx",
        // @ts-expect-error
        metadata: { nonexisting: null },
      });
      void editMetadata({
        threadId: "th_xxx",
        // @ts-expect-error
        metadata: { nonexisting: 123 },
      });

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          metadata: { color: "red", pinned: null },
        })
      ).toEqualTypeOf<void>();

      void editMetadata({
        threadId: "th_xxx",
        // @ts-expect-error
        metadata: { color: null },
      }); // Color isn't optional, so cannot be wiped
    }
  });

  test("useEditThreadMetadata() (suspense)", () => {
    {
      const editMetadata = suspense.useEditThreadMetadata();
      // @ts-expect-error
      void editMetadata({}); // no body = error

      void editMetadata({
        threadId: "th_xxx",
        // @ts-expect-error
        metadata: { nonexisting: null },
      });
      void editMetadata({
        threadId: "th_xxx",
        // @ts-expect-error
        metadata: { nonexisting: 123 },
      });

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          metadata: { color: "red", pinned: null },
        })
      ).toEqualTypeOf<void>();

      void editMetadata({
        threadId: "th_xxx",
        // @ts-expect-error
        metadata: { color: null },
      }); // Color isn't optional, so cannot be wiped
    }
  });

  test("useCreateComment()", () => {
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
          metadata: {
            priority: 2,
            reviewed: false,
          },
        });

        expectTypeOf(comment.type).toEqualTypeOf<"comment">();
        expectTypeOf(comment.id).toEqualTypeOf<string>();
        expectTypeOf(comment.metadata.priority).toEqualTypeOf<number>();
        expectTypeOf(comment.metadata.reviewed).toEqualTypeOf<
          boolean | undefined
        >();
        // @ts-expect-error
        void comment.metadata.nonexisting;
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
        metadata: { priority: 1 },
      });

      expectTypeOf(comment.type).toEqualTypeOf<"comment">();
      expectTypeOf(comment.metadata.priority).toEqualTypeOf<number>();
      // @ts-expect-error
      void comment.metadata.nonexisting;
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
          metadata: { priority: 2, reviewed: null },
        })
      ).toEqualTypeOf<void>();

      void editComment({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        body: { version: 1, content: [] },
        // @ts-expect-error
        metadata: { nonexisting: null },
      });
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

      void editComment({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        body: { version: 1, content: [] },
        // @ts-expect-error
        metadata: { nonexisting: null },
      });
    }
  });

  test("useEditCommentMetadata()", () => {
    {
      const editMetadata = classic.useEditCommentMetadata();
      // @ts-expect-error
      void editMetadata({}); // no body = error

      void editMetadata({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        // @ts-expect-error
        metadata: { nonexisting: null },
      });
      void editMetadata({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        // @ts-expect-error
        metadata: { nonexisting: 123 },
      });

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", commentId: "cm_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          metadata: { priority: 2, reviewed: null },
        })
      ).toEqualTypeOf<void>();

      void editMetadata({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        // @ts-expect-error
        metadata: { priority: null },
      }); // priority isn't optional, so it cannot be wiped
    }
  });

  test("useEditCommentMetadata() (suspense)", () => {
    {
      const editMetadata = suspense.useEditCommentMetadata();
      // @ts-expect-error
      void editMetadata({}); // no body = error

      void editMetadata({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        // @ts-expect-error
        metadata: { nonexisting: null },
      });
      void editMetadata({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        // @ts-expect-error
        metadata: { nonexisting: 123 },
      });

      expectTypeOf(
        editMetadata({ threadId: "th_xxx", commentId: "cm_xxx", metadata: {} })
      ).toEqualTypeOf<void>();
      expectTypeOf(
        editMetadata({
          threadId: "th_xxx",
          commentId: "cm_xxx",
          metadata: { priority: 2, reviewed: null },
        })
      ).toEqualTypeOf<void>();

      void editMetadata({
        threadId: "th_xxx",
        commentId: "cm_xxx",
        // @ts-expect-error
        metadata: { priority: null },
      }); // priority isn't optional, so it cannot be wiped
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
      expectTypeOf(result.metadata.color).toEqualTypeOf<"red" | "blue">();
      // @ts-expect-error
      void result.metadata.nonexisting;
    }
  });

  test("useInboxNotificationThread() (suspense)", () => {
    {
      const result = suspense.useInboxNotificationThread("in_xxx");
      expectTypeOf(result.type).toEqualTypeOf<"thread">();
      expectTypeOf(result.roomId).toEqualTypeOf<string>();
      expectTypeOf(result.comments).toExtend<unknown[]>();
      expectTypeOf(result.metadata.color).toEqualTypeOf<"red" | "blue">();
      // @ts-expect-error
      void result.metadata.nonexisting;
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
      const status = classic.useAiChatStatus("chat-id");
      expectTypeOf(status.status).toEqualTypeOf<
        "disconnected" | "idle" | "loading" | "generating"
      >();
      if (status.status === "generating") {
        // The partType might not exist if there's no content yet
        expectTypeOf(status.partType).toEqualTypeOf<
          | "text"
          | "reasoning"
          | "retrieval"
          | "tool-invocation"
          | "sources"
          | undefined
        >();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useAiChatStatus() (suspense)", () => {
    {
      const status = suspense.useAiChatStatus("chat-id");
      expectTypeOf(status.status).toEqualTypeOf<
        "disconnected" | "idle" | "loading" | "generating"
      >();
      if (status.status === "generating") {
        // The partType might not exist if there's no content yet
        expectTypeOf(status.partType).toEqualTypeOf<
          | "text"
          | "reasoning"
          | "retrieval"
          | "tool-invocation"
          | "sources"
          | undefined
        >();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useAiChatStatus() with optional branchId", () => {
    {
      const status = classic.useAiChatStatus("chat-id", "ms_branch" as any);
      if (status.status === "generating") {
        // The partType might not exist if there's no content yet
        expectTypeOf(status.partType).toEqualTypeOf<
          | "text"
          | "reasoning"
          | "retrieval"
          | "tool-invocation"
          | "sources"
          | undefined
        >();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useAiChatStatus() with optional branchId (suspense)", () => {
    {
      const status = suspense.useAiChatStatus("chat-id", "ms_branch" as any);
      if (status.status === "generating") {
        // The partType might not exist if there's no content yet
        expectTypeOf(status.partType).toEqualTypeOf<
          | "text"
          | "reasoning"
          | "retrieval"
          | "tool-invocation"
          | "sources"
          | undefined
        >();
        if (status.partType === "tool-invocation") {
          expectTypeOf(status.toolName).toEqualTypeOf<string>();
        } else {
          expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
        }
      } else {
        expectTypeOf(status.partType).toEqualTypeOf<undefined>();
        expectTypeOf(status.toolName).toEqualTypeOf<undefined>();
      }
    }
  });
});

