import React from "react";
import type {
  NotificationSettings,
  Json,
  Room,
  User,
} from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import {
  createLiveblocksContext,
  createRoomContext,
  type AiChatStatus,
} from "@liveblocks/react";
import { describe, expectTypeOf, test } from "vitest";

type MyPresence = {
  cursor: { x: number; y: number };
};

type MyStorage = {
  animals: LiveList<string>;
  scores: LiveMap<string, number>;
  person: LiveObject<{ name: string; age: number }>;
};

type MyUserMeta = {
  id: string;
  info: {
    name: string;
    age: number;
  };
};

type MyRoomEvent =
  | { type: "emoji"; emoji: string }
  | { type: "beep"; times?: number };

type MyThreadMetadata = {
  color: "red" | "blue";
  pinned?: boolean;
};

type P = MyPresence;
type S = MyStorage;
type U = MyUserMeta;
type E = MyRoomEvent;
type M = MyThreadMetadata;

const client = createClient({ publicApiKey: "pk_whatever" });

const lbctx = createLiveblocksContext<U, M>(client);
const ctx = createRoomContext<P, S, U, E, M>(client);

describe("createLiveblocksContext / createRoomContext factories", () => {
  test("LiveblocksProvider", () => {
    {
      const LiveblocksProvider = lbctx.LiveblocksProvider;

      // The only valid instantiation of the <LiveblocksProvider> as returned from
      // a context factory is one without any props! This is because the factory
      // itself already binds it to the client instance.
      <LiveblocksProvider />;

      // So all of the following ones are errors
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider throttle={16} />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider authEndpoint="/api/auth" />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider publicApiKey="pk_xxx" />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider authEndpoint="/api/auth" throttle={16} />
        )
      );
      void (
        <LiveblocksProvider
          // @ts-expect-error
          authEndpoint={async () => ({ token: "token" })}
          throttle={16}
        />
      );
      void (
        <LiveblocksProvider
          // @ts-expect-error
          authEndpoint="/api/auth"
          resolveUsers={async () => [{ foo: "bar" }]}
        />
      );
      void (
        <LiveblocksProvider
          // @ts-expect-error
          authEndpoint="/api/auth"
          resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
        />
      );
    }
  });

  test("LiveblocksProvider (suspense)", () => {
    {
      const LiveblocksProvider = lbctx.suspense.LiveblocksProvider;

      // The only valid instantiation of the <LiveblocksProvider> as returned from
      // a context factory is one without any props! This is because the factory
      // itself already binds it to the client instance.
      <LiveblocksProvider />;

      // So all of the following ones are errors
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider throttle={16} />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider authEndpoint="/api/auth" />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider publicApiKey="pk_xxx" />
        )
      );
      void (
        (
          // @ts-expect-error
          <LiveblocksProvider authEndpoint="/api/auth" throttle={16} />
        )
      );
      void (
        <LiveblocksProvider
          // @ts-expect-error
          authEndpoint={async () => ({ token: "token" })}
          throttle={16}
        />
      );
      void (
        <LiveblocksProvider
          // @ts-expect-error
          authEndpoint="/api/auth"
          resolveUsers={async () => [{ foo: "bar" }]}
        />
      );
      void (
        <LiveblocksProvider
          // @ts-expect-error
          authEndpoint="/api/auth"
          resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
        />
      );
    }
  });

  test("RoomProvider", () => {
    {
      const RoomProvider = ctx.RoomProvider;

      // Missing mandatory props is an error
      void (
        (
          // @ts-expect-error
          <RoomProvider>
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialPresence + initialStorage
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
        <RoomProvider
          id="my-room"
          initialPresence={{ cursor: { x: 0, y: 0 } }}
          initialStorage={{
            // Incorrect initialStorage
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
      const RoomProvider = ctx.suspense.RoomProvider;

      // Missing mandatory props is an error
      void (
        (
          // @ts-expect-error
          <RoomProvider>
            <div />
          </RoomProvider>
        )
      );

      void (
        (
          // @ts-expect-error - Missing mandatory initialPresence + initialStorage
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
        <RoomProvider
          id="my-room"
          initialPresence={{ cursor: { x: 0, y: 0 } }}
          initialStorage={{
            // Incorrect initialStorage
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
    expectTypeOf(ctx.useRoom()).toEqualTypeOf<Room<P, S, U, E, M>>();
    expectTypeOf(ctx.useRoom({ allowOutsideRoom: false })).toEqualTypeOf<
      Room<P, S, U, E, M>
    >();
    expectTypeOf(
      ctx.useRoom({ allowOutsideRoom: Math.random() < 0.5 })
    ).toEqualTypeOf<Room<P, S, U, E, M> | null>();
    expectTypeOf(ctx.useRoom({ allowOutsideRoom: true })).toEqualTypeOf<Room<
      P,
      S,
      U,
      E,
      M
    > | null>();
  });

  test("useIsInsideRoom()", () => {
    expectTypeOf(ctx.useIsInsideRoom()).toEqualTypeOf<boolean>();
    expectTypeOf(lbctx.useIsInsideRoom()).toEqualTypeOf<boolean>();
  });

  test("presence hooks", () => {
    expectTypeOf(ctx.useSelf()!.presence).toEqualTypeOf<P>();
    expectTypeOf(ctx.useOthers()).toEqualTypeOf<readonly User<P, U>[]>();
    expectTypeOf(ctx.useOthers()[0]!.presence).toEqualTypeOf<P>();
    expectTypeOf(
      ctx.useOthersMapped((u) => u.presence)[0]![1]
    ).toEqualTypeOf<P>();
    expectTypeOf(ctx.useOthersConnectionIds()).toEqualTypeOf<
      readonly number[]
    >();
    expectTypeOf(ctx.useOther(123, (o) => o.presence)).toEqualTypeOf<P>();
    expectTypeOf(ctx.useMyPresence()[0]).toEqualTypeOf<P>();
  });

  test("presence hooks (suspense)", () => {
    expectTypeOf(ctx.suspense.useSelf().presence).toEqualTypeOf<P>();
    expectTypeOf(ctx.suspense.useOthers()).toEqualTypeOf<
      readonly User<P, U>[]
    >();
    expectTypeOf(ctx.suspense.useOthers()[0]!.presence).toEqualTypeOf<P>();
    expectTypeOf(
      ctx.suspense.useOthersMapped((u) => u.presence)[0]![1]
    ).toEqualTypeOf<P>();
    expectTypeOf(ctx.suspense.useOthersConnectionIds()).toEqualTypeOf<
      readonly number[]
    >();
    expectTypeOf(
      ctx.suspense.useOther(123, (o) => o.presence)
    ).toEqualTypeOf<P>();
    expectTypeOf(ctx.suspense.useMyPresence()[0]).toEqualTypeOf<P>();
  });

  test("storage hooks", () => {
    expectTypeOf(ctx.useStorage((x) => x.animals)).toEqualTypeOf<
      readonly string[] | null
    >();
    expectTypeOf(ctx.useStorage((x) => x.scores)).toEqualTypeOf<{
      readonly [key: string]: number;
    } | null>();
    expectTypeOf(ctx.useStorage((x) => x.person)).toEqualTypeOf<{
      readonly name: string;
      readonly age: number;
    } | null>();

    expectTypeOf(ctx.useStorageRoot()).toEqualTypeOf<
      [root: LiveObject<MyStorage> | null]
    >();
  });

  test("storage hooks (suspense)", () => {
    expectTypeOf(ctx.suspense.useStorage((x) => x.animals)).toEqualTypeOf<
      readonly string[]
    >();
    expectTypeOf(ctx.suspense.useStorage((x) => x.scores)).toEqualTypeOf<{
      readonly [key: string]: number;
    }>();
    expectTypeOf(ctx.suspense.useStorage((x) => x.person)).toEqualTypeOf<{
      readonly name: string;
      readonly age: number;
    }>();

    expectTypeOf(ctx.suspense.useStorageRoot()).toEqualTypeOf<
      [root: LiveObject<MyStorage> | null]
    >();
    //                                        ^^^^ Despite being a Suspense hook,
    //                                             this one still returns `null`,
    //                                             as it's used as a building
    //                                             block. This is NOT a bug.
  });

  test("useOthersListener()", () => {
    ctx.useOthersListener((event) => {
      expectTypeOf(event.others).toEqualTypeOf<readonly User<P, U>[]>();
      switch (event.type) {
        case "enter":
          expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
          return;
        case "leave":
          expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
          return;
        case "update":
          expectTypeOf(event.user).toEqualTypeOf<User<P, U>>();
          expectTypeOf(event.updates).toEqualTypeOf<Partial<P>>();
          return;
        case "reset":
          // No extra fields on reset
          return;
        default:
          expectTypeOf(event).toEqualTypeOf<never>();
      }
    });
  });

  test("useOthersListener() with inline unpacking", () => {
    ctx.useOthersListener(({ user, type }) => {
      expectTypeOf(user).toEqualTypeOf<User<P, U> | undefined>();
      expectTypeOf(type).toEqualTypeOf<
        "enter" | "leave" | "update" | "reset"
      >();
      switch (type) {
        case "enter":
          expectTypeOf(user).toEqualTypeOf<User<P, U>>();
          return;
        case "leave":
          expectTypeOf(user).toEqualTypeOf<User<P, U>>();
          return;
        case "update":
          expectTypeOf(user).toEqualTypeOf<User<P, U>>();
          return;
        case "reset":
          // No extra fields on reset
          expectTypeOf(user).toEqualTypeOf<undefined>();
          return;
        default:
          expectTypeOf(type).toEqualTypeOf<never>();
      }
    });
  });

  test("useErrorListener()", () => {
    {
      ctx.useErrorListener((err) => {
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

      lbctx.useErrorListener((err) => {
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

      lbctx.suspense.useErrorListener((err) => {
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
      const me = ctx.useSelf();
      expectTypeOf(me?.presence.cursor.x).toEqualTypeOf<number | undefined>();
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
      const me = ctx.suspense.useSelf();
      expectTypeOf(me.presence.cursor.x).toEqualTypeOf<number>();
      // @ts-expect-error
      void me.presence.nonexisting;

      expectTypeOf(me.info.name).toEqualTypeOf<string>();
      expectTypeOf(me.info.age).toEqualTypeOf<number>();
      // @ts-expect-error
      void me.info.nonexisting;
    }
  });

  test("useMutation()", () => {
    {
      expectTypeOf(
        ctx.useMutation((mut, _a: number, _b: boolean) => {
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
        ctx.suspense.useMutation((mut, _a: number, _b: boolean) => {
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

  test("useUser()", () => {
    {
      {
        const { user, error, isLoading } = ctx.useUser("user-id");
        //                                 ^^^ [1]
        expectTypeOf(isLoading).toEqualTypeOf<boolean>();
        expectTypeOf(user?.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(user?.age).toEqualTypeOf<number | undefined>();
        expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      }
      {
        const { user, error, isLoading } = lbctx.useUser("user-id");
        //                                 ^^^^^ [2]
        expectTypeOf(isLoading).toEqualTypeOf<boolean>();
        expectTypeOf(user?.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(user?.age).toEqualTypeOf<number | undefined>();
        expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      }
    }
  });

  test("useUser() (suspense)", () => {
    {
      {
        const { user, error, isLoading } = ctx.suspense.useUser("user-id");
        //                                 ^^^^^^^^^^^^ [3]
        expectTypeOf(isLoading).toEqualTypeOf<false>();
        expectTypeOf(user.name).toEqualTypeOf<string>();
        expectTypeOf(user.age).toEqualTypeOf<number>();
        expectTypeOf(error).toEqualTypeOf<undefined>();
      }
      {
        const { user, error, isLoading } = lbctx.suspense.useUser("user-id");
        //                                 ^^^^^^^^^^^^^^ [4]
        expectTypeOf(isLoading).toEqualTypeOf<false>();
        expectTypeOf(user.name).toEqualTypeOf<string>();
        expectTypeOf(user.age).toEqualTypeOf<number>();
        expectTypeOf(error).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useRoomInfo()", () => {
    {
      {
        const { info, error, isLoading } = ctx.useRoomInfo("room-id");
        //                                 ^^^ [1]
        expectTypeOf(isLoading).toEqualTypeOf<boolean>();
        expectTypeOf(info?.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.url).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      }
      {
        const { info, error, isLoading } = lbctx.useRoomInfo("room-id");
        //                                 ^^^^^ [2]
        expectTypeOf(isLoading).toEqualTypeOf<boolean>();
        expectTypeOf(info?.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.url).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      }
    }
  });

  test("useRoomInfo() (suspense)", () => {
    {
      {
        const { info, error, isLoading } = ctx.suspense.useRoomInfo("room-id");
        //                                 ^^^^^^^^^^^^ [3]
        expectTypeOf(isLoading).toEqualTypeOf<false>();
        expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.url).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<undefined>();
      }
      {
        const { info, error, isLoading } =
          lbctx.suspense.useRoomInfo("room-id");
        //                                 ^^^^^^^^^^^^^^ [4]
        expectTypeOf(isLoading).toEqualTypeOf<false>();
        expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.url).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useGroupInfo()", () => {
    {
      {
        const { info, error, isLoading } = ctx.useGroupInfo("group-id");
        //                                 ^^^ [1]
        expectTypeOf(isLoading).toEqualTypeOf<boolean>();
        expectTypeOf(info?.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.avatar).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      }
      {
        const { info, error, isLoading } = lbctx.useGroupInfo("group-id");
        //                                 ^^^^^ [2]
        expectTypeOf(isLoading).toEqualTypeOf<boolean>();
        expectTypeOf(info?.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.avatar).toEqualTypeOf<string | undefined>();
        expectTypeOf(info?.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      }
    }
  });

  test("useGroupInfo() (suspense)", () => {
    {
      {
        const { info, error, isLoading } =
          ctx.suspense.useGroupInfo("group-id");
        //                                 ^^^^^^^^^^^^ [3]
        expectTypeOf(isLoading).toEqualTypeOf<false>();
        expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.avatar).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<undefined>();
      }
      {
        const { info, error, isLoading } =
          lbctx.suspense.useGroupInfo("group-id");
        //                                 ^^^^^^^^^^^^^^ [4]
        expectTypeOf(isLoading).toEqualTypeOf<false>();
        expectTypeOf(info.name).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.avatar).toEqualTypeOf<string | undefined>();
        expectTypeOf(info.nonexisting).toEqualTypeOf<Json | undefined>();
        expectTypeOf(error).toEqualTypeOf<undefined>();
      }
    }
  });

  test("useCreateThread()", () => {
    {
      {
        const untypedCtx = createRoomContext(client);
        const createThread = untypedCtx.useCreateThread();
        //                   ^^^^^^^^^^ [1]
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

        // But... creating a thread _with_ metadata is now an error
        const thread2 = createThread({
          body: {
            version: 1,
            content: [{ type: "paragraph", children: [{ text: "hi" }] }],
          },
          metadata: { foo: "bar" },
        });

        expectTypeOf(thread2.id).toEqualTypeOf<string>();
      }

      {
        const createThread = ctx.useCreateThread();
        //                   ^^^ [2]
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
        });

        expectTypeOf(thread.type).toEqualTypeOf<"thread">();
        expectTypeOf(thread.id).toEqualTypeOf<string>();
        expectTypeOf(thread.roomId).toEqualTypeOf<string>();
        expectTypeOf(thread.comments[0]!.type).toEqualTypeOf<"comment">();
        expectTypeOf(thread.comments[0]!.id).toEqualTypeOf<string>();
        expectTypeOf(thread.comments[0]!.threadId).toEqualTypeOf<string>();

        expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
      }
    }
  });

  test("useCreateThread() (suspense)", () => {
    {
      {
        const untypedCtx = createRoomContext(client);
        const createThread = untypedCtx.suspense.useCreateThread();
        //                   ^^^^^^^^^^^^^^^^^^^ [3]
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
      }

      {
        const createThread = ctx.suspense.useCreateThread();
        //                   ^^^^^^^^^^^^ [4]
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
        });

        expectTypeOf(thread.type).toEqualTypeOf<"thread">();
        expectTypeOf(thread.id).toEqualTypeOf<string>();
        expectTypeOf(thread.roomId).toEqualTypeOf<string>();
        expectTypeOf(thread.comments[0]!.type).toEqualTypeOf<"comment">();
        expectTypeOf(thread.comments[0]!.id).toEqualTypeOf<string>();
        expectTypeOf(thread.comments[0]!.threadId).toEqualTypeOf<string>();

        expectTypeOf(thread.metadata.color).toEqualTypeOf<"red" | "blue">();
      }
    }
  });

  test("useEditThreadMetadata()", () => {
    {
      {
        const untypedCtx = createRoomContext(client);
        const editMetadata = untypedCtx.useEditThreadMetadata();
        //                   ^^^^^^^^^^ [1]
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

      {
        const editMetadata = ctx.useEditThreadMetadata();
        //                   ^^^ [2]
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
        }); // Color isn't optional so cannot be wiped
      }
    }
  });

  test("useEditThreadMetadata() (suspense)", () => {
    {
      {
        const untypedCtx = createRoomContext(client);
        const editMetadata = untypedCtx.suspense.useEditThreadMetadata();
        //                   ^^^^^^^^^^^^^^^^^^^ [3]
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

      {
        const editMetadata = ctx.suspense.useEditThreadMetadata();
        //                   ^^^^^^^^^^^^ [4]
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
        }); // Color isn't optional so cannot be wiped
      }
    }
  });

  test("useCreateComment()", () => {
    {
      {
        const createComment = ctx.useCreateComment();
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
      }
    }
  });

  test("useCreateComment() (suspense)", () => {
    {
      const createComment = ctx.suspense.useCreateComment();
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
    }
  });

  test("useEditComment()", () => {
    {
      const editComment = ctx.useEditComment();
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
      const editComment = ctx.suspense.useEditComment();
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

  test("useDeleteComment()", () => {
    {
      const deleteComment = ctx.useDeleteComment();

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
      const deleteComment = ctx.suspense.useDeleteComment();

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
      const addReaction = ctx.useAddReaction();

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
      const addReaction = ctx.suspense.useAddReaction();

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
      const removeReaction = ctx.useRemoveReaction();

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
      const removeReaction = ctx.suspense.useRemoveReaction();

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
      const result = lbctx.useInboxNotifications();
      expectTypeOf(result.isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(result.error).toEqualTypeOf<Error | undefined>();
      expectTypeOf(
        result.inboxNotifications?.map((ibn) => ibn.kind)
      ).toEqualTypeOf<
        ("thread" | "textMention" | `$${string}`)[] | undefined
      >();
      expectTypeOf(
        result.inboxNotifications?.map((ibn) => ibn.roomId)
      ).toEqualTypeOf<(string | undefined)[] | undefined>();
    }
  });

  test("useInboxNotifications() (suspense)", () => {
    {
      const result = lbctx.suspense.useInboxNotifications();
      expectTypeOf(result.isLoading).toEqualTypeOf<false>();
      expectTypeOf(result.error).toEqualTypeOf<undefined>();
      expectTypeOf(
        result.inboxNotifications?.map((ibn) => ibn.kind)
      ).toEqualTypeOf<("thread" | "textMention" | `$${string}`)[]>();
      expectTypeOf(
        result.inboxNotifications?.map((ibn) => ibn.roomId)
      ).toEqualTypeOf<(string | undefined)[]>();
    }
  });

  test("useInboxNotificationThread()", () => {
    {
      const result = lbctx.useInboxNotificationThread("in_xxx");
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
      const result = lbctx.suspense.useInboxNotificationThread("in_xxx");
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
      const markRead = lbctx.useMarkInboxNotificationAsRead();
      expectTypeOf(markRead("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useMarkInboxNotificationAsRead() (suspense)", () => {
    {
      const markRead = lbctx.suspense.useMarkInboxNotificationAsRead();
      expectTypeOf(markRead("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useMarkAllInboxNotificationsAsRead()", () => {
    {
      const markAllRead = lbctx.useMarkAllInboxNotificationsAsRead();
      expectTypeOf(markAllRead()).toEqualTypeOf<void>();
    }
  });

  test("useMarkAllInboxNotificationsAsRead() (suspense)", () => {
    {
      const markAllRead = lbctx.suspense.useMarkAllInboxNotificationsAsRead();
      expectTypeOf(markAllRead()).toEqualTypeOf<void>();
    }
  });

  test("useDeleteInboxNotification()", () => {
    {
      const deleteNotification = lbctx.useDeleteInboxNotification();
      expectTypeOf(deleteNotification("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useDeleteInboxNotification() (suspense)", () => {
    {
      const deleteNotification = lbctx.suspense.useDeleteInboxNotification();
      expectTypeOf(deleteNotification("in_xxx")).toEqualTypeOf<void>();
    }
  });

  test("useDeleteAllInboxNotifications()", () => {
    {
      const deleteAllNotifications = lbctx.useDeleteAllInboxNotifications();
      expectTypeOf(deleteAllNotifications()).toEqualTypeOf<void>();
    }
  });

  test("useDeleteAllInboxNotifications() (suspense)", () => {
    {
      const deleteAllNotifications =
        lbctx.suspense.useDeleteAllInboxNotifications();
      expectTypeOf(deleteAllNotifications()).toEqualTypeOf<void>();
    }
  });

  test("useUnreadInboxNotificationsCount()", () => {
    {
      const { count, error, isLoading } =
        lbctx.useUnreadInboxNotificationsCount();
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(count).toEqualTypeOf<number | undefined>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
    }
  });

  test("useUnreadInboxNotificationsCount() (suspense)", () => {
    {
      const { count, error, isLoading } =
        lbctx.suspense.useUnreadInboxNotificationsCount();
      expectTypeOf(isLoading).toEqualTypeOf<false>();
      expectTypeOf(count).toEqualTypeOf<number>();
      expectTypeOf(error).toEqualTypeOf<undefined>();
    }
  });

  test("useSyncStatus()", () => {
    {
      const status = lbctx.useSyncStatus();
      expectTypeOf(status).toEqualTypeOf<"synchronizing" | "synchronized">();
    }
    {
      const status = lbctx.suspense.useSyncStatus();
      expectTypeOf(status).toEqualTypeOf<"synchronizing" | "synchronized">();
    }
    {
      const status = ctx.useSyncStatus();
      expectTypeOf(status).toEqualTypeOf<"synchronizing" | "synchronized">();
    }
    {
      const status = ctx.suspense.useSyncStatus();
      expectTypeOf(status).toEqualTypeOf<"synchronizing" | "synchronized">();
    }
  });

  test("useNotificationSettings()", () => {
    {
      const [{ isLoading, error, settings }, update] =
        lbctx.useNotificationSettings();
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      expectTypeOf(settings).toEqualTypeOf<NotificationSettings | undefined>();
      expectTypeOf(update({})).toEqualTypeOf<void>(); // empty {} because of partial definition
    }
  });

  test("useNotificationSettings() (suspense)", () => {
    {
      const [{ isLoading, error, settings }, update] =
        lbctx.suspense.useNotificationSettings();
      expectTypeOf(isLoading).toEqualTypeOf<boolean>();
      expectTypeOf(error).toEqualTypeOf<Error | undefined>();
      expectTypeOf(settings).toEqualTypeOf<NotificationSettings | undefined>();
      expectTypeOf(update({})).toEqualTypeOf<void>(); // empty {} because of partial definition
    }
  });

  test("useAiChatStatus()", () => {
    {
      const status = lbctx.useAiChatStatus("chat-123");
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
      const status = lbctx.suspense.useAiChatStatus("chat-123");
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
      const status = lbctx.useAiChatStatus("chat-123", "ms_branch" as any);
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
      const status = lbctx.suspense.useAiChatStatus(
        "chat-123",
        "ms_branch" as any
      );
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

