import type {
  NotificationSettings,
  Json,
  Room,
  User,
} from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";
import { expectAssignable, expectError, expectType } from "tsd";

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

// LiveblocksProvider
{
  const LiveblocksProvider = lbctx.LiveblocksProvider;

  // The only valid instantiation of the <LiveblocksProvider> as returned from
  // a context factory is one without any props! This is because the factory
  // itself already binds it to the client instance.
  <LiveblocksProvider />;

  // So all of the following ones are errors
  expectError(<LiveblocksProvider throttle={16} />);
  expectError(<LiveblocksProvider authEndpoint="/api/auth" />);
  expectError(<LiveblocksProvider publicApiKey="pk_xxx" />);
  expectError(<LiveblocksProvider authEndpoint="/api/auth" throttle={16} />);
  expectError(
    <LiveblocksProvider
      authEndpoint={async () => ({ token: "token" })}
      throttle={16}
    />
  );
  expectError(
    <LiveblocksProvider
      authEndpoint="/api/auth"
      resolveUsers={async () => [{ foo: "bar" }]}
    />
  );
  expectError(
    <LiveblocksProvider
      authEndpoint="/api/auth"
      resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
    />
  );
}

// LiveblocksProvider (suspense)
{
  const LiveblocksProvider = lbctx.suspense.LiveblocksProvider;

  // The only valid instantiation of the <LiveblocksProvider> as returned from
  // a context factory is one without any props! This is because the factory
  // itself already binds it to the client instance.
  <LiveblocksProvider />;

  // So all of the following ones are errors
  expectError(<LiveblocksProvider throttle={16} />);
  expectError(<LiveblocksProvider authEndpoint="/api/auth" />);
  expectError(<LiveblocksProvider publicApiKey="pk_xxx" />);
  expectError(<LiveblocksProvider authEndpoint="/api/auth" throttle={16} />);
  expectError(
    <LiveblocksProvider
      authEndpoint={async () => ({ token: "token" })}
      throttle={16}
    />
  );
  expectError(
    <LiveblocksProvider
      authEndpoint="/api/auth"
      resolveUsers={async () => [{ foo: "bar" }]}
    />
  );
  expectError(
    <LiveblocksProvider
      authEndpoint="/api/auth"
      resolveUsers={async () => [{ name: "Vincent", age: 42 }]}
    />
  );
}

// RoomProvider
{
  const RoomProvider = ctx.RoomProvider;

  // Missing mandatory props is an error
  expectError(
    <RoomProvider>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialPresence + initialStorage
    <RoomProvider id="my-room">
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialStorage
    <RoomProvider id="my-room" initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialPresence
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
  );

  expectError(
    // Incorrect initialStorage
    <RoomProvider
      id="my-room"
      initialPresence={{ cursor: { x: 0, y: 0 } }}
      initialStorage={{
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

// RoomProvider (suspense)
{
  const RoomProvider = ctx.suspense.RoomProvider;

  // Missing mandatory props is an error
  expectError(
    <RoomProvider>
      <div />
    </RoomProvider>
  );

  expectError(
    <RoomProvider id="my-room">
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialStorage
    <RoomProvider id="my-room" initialPresence={{ cursor: { x: 0, y: 0 } }}>
      <div />
    </RoomProvider>
  );

  expectError(
    // Missing mandatory initialPresence
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
  );

  expectError(
    // Incorrect initialStorage
    <RoomProvider
      id="my-room"
      initialPresence={{ cursor: { x: 0, y: 0 } }}
      initialStorage={{
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

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

// The useRoom() hook
expectType<Room<P, S, U, E, M>>(ctx.useRoom());
expectType<Room<P, S, U, E, M>>(ctx.useRoom({ allowOutsideRoom: false }));
expectType<Room<P, S, U, E, M> | null>(
  ctx.useRoom({ allowOutsideRoom: Math.random() < 0.5 })
);
expectType<Room<P, S, U, E, M> | null>(ctx.useRoom({ allowOutsideRoom: true }));

// useIsInsideRoom()
expectType<boolean>(ctx.useIsInsideRoom());
expectType<boolean>(lbctx.useIsInsideRoom());

// The presence hooks
expectType<P>(ctx.useSelf()!.presence);
expectType<readonly User<P, U>[]>(ctx.useOthers());
expectType<P>(ctx.useOthers()[0]!.presence);
expectType<P>(ctx.useOthersMapped((u) => u.presence)[0]![1]);
expectType<readonly number[]>(ctx.useOthersConnectionIds());
expectType<P>(ctx.useOther(123, (o) => o.presence));
expectType<P>(ctx.useMyPresence()[0]);

// The presence hooks (suspense versions)
expectType<P>(ctx.suspense.useSelf().presence);
expectType<readonly User<P, U>[]>(ctx.suspense.useOthers());
expectType<P>(ctx.suspense.useOthers()[0]!.presence);
expectType<P>(ctx.suspense.useOthersMapped((u) => u.presence)[0]![1]);
expectType<readonly number[]>(ctx.suspense.useOthersConnectionIds());
expectType<P>(ctx.suspense.useOther(123, (o) => o.presence));
expectType<P>(ctx.suspense.useMyPresence()[0]);

// The storage hooks
expectType<readonly string[] | null>(ctx.useStorage((x) => x.animals));
expectType<ReadonlyMap<string, number> | null>(ctx.useStorage((x) => x.scores));
expectType<{ readonly name: string; readonly age: number } | null>(
  ctx.useStorage((x) => x.person)
);

expectType<[root: LiveObject<MyStorage> | null]>(ctx.useStorageRoot());

// The storage hooks (suspense versions)
expectType<readonly string[]>(ctx.suspense.useStorage((x) => x.animals));
expectType<ReadonlyMap<string, number>>(
  ctx.suspense.useStorage((x) => x.scores)
);
expectType<{ readonly name: string; readonly age: number }>(
  ctx.suspense.useStorage((x) => x.person)
);

expectType<[root: LiveObject<MyStorage> | null]>(ctx.suspense.useStorageRoot());
//                                        ^^^^ Despite being a Suspense hook,
//                                             this one still returns `null`,
//                                             as it's used as a building
//                                             block. This is NOT a bug.

// The useOthersListener() hook
ctx.useOthersListener((event) => {
  expectType<readonly User<P, U>[]>(event.others);
  switch (event.type) {
    case "enter":
      expectType<User<P, U>>(event.user);
      return;
    case "leave":
      expectType<User<P, U>>(event.user);
      return;
    case "update":
      expectType<User<P, U>>(event.user);
      expectType<Partial<P>>(event.updates);
      return;
    case "reset":
      // No extra fields on reset
      return;
    default:
      expectType<never>(event);
  }
});

// The useOthersListener() hook with inline unpacking
ctx.useOthersListener(({ user, type }) => {
  expectType<User<P, U> | undefined>(user);
  expectType<"enter" | "leave" | "update" | "reset">(type);
  switch (type) {
    case "enter":
      expectType<User<P, U>>(user);
      return;
    case "leave":
      expectType<User<P, U>>(user);
      return;
    case "update":
      expectType<User<P, U>>(user);
      return;
    case "reset":
      // No extra fields on reset
      expectType<undefined>(user);
      return;
    default:
      expectType<never>(type);
  }
});

// useErrorListener()
{
  ctx.useErrorListener((err) => {
    expectType<string>(err.message);
    expectType<string | undefined>(err.stack);
    expectType<-1 | 4001 | 4005 | 4006 | (number & {}) | undefined>(
      err.context.code
    );
    expectAssignable<
      | "AI_CONNECTION_ERROR"
      | "ROOM_CONNECTION_ERROR"
      | "CREATE_THREAD_ERROR"
      | "DELETE_THREAD_ERROR"
      | "EDIT_THREAD_METADATA_ERROR"
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
    >(err.context.type);
    if (err.context.type === "ROOM_CONNECTION_ERROR") {
      expectAssignable<number>(err.context.code);
      expectAssignable<number | undefined>(err.context.code);
    } else if (err.context.type === "CREATE_THREAD_ERROR") {
      expectType<string>(err.context.roomId);
      expectType<string>(err.context.threadId);
      expectType<string>(err.context.commentId);
    } else {
      // Not going to list them all...
    }
  });

  lbctx.useErrorListener((err) => {
    expectType<string>(err.message);
    expectType<string | undefined>(err.stack);
    expectType<-1 | 4001 | 4005 | 4006 | (number & {}) | undefined>(
      err.context.code
    );
    expectAssignable<
      | "AI_CONNECTION_ERROR"
      | "ROOM_CONNECTION_ERROR"
      | "CREATE_THREAD_ERROR"
      | "DELETE_THREAD_ERROR"
      | "EDIT_THREAD_METADATA_ERROR"
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
    >(err.context.type);
    if (err.context.type === "ROOM_CONNECTION_ERROR") {
      expectAssignable<number>(err.context.code);
      expectAssignable<number | undefined>(err.context.code);
    } else if (err.context.type === "CREATE_THREAD_ERROR") {
      expectType<string>(err.context.roomId);
      expectType<string>(err.context.threadId);
      expectType<string>(err.context.commentId);
    } else {
      // Not going to list them all...
    }
  });

  lbctx.suspense.useErrorListener((err) => {
    expectType<string>(err.message);
    expectType<string | undefined>(err.stack);
    expectType<-1 | 4001 | 4005 | 4006 | (number & {}) | undefined>(
      err.context.code
    );
    expectAssignable<
      | "AI_CONNECTION_ERROR"
      | "ROOM_CONNECTION_ERROR"
      | "CREATE_THREAD_ERROR"
      | "DELETE_THREAD_ERROR"
      | "EDIT_THREAD_METADATA_ERROR"
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
    >(err.context.type);
    if (err.context.type === "ROOM_CONNECTION_ERROR") {
      expectAssignable<number>(err.context.code);
      expectAssignable<number | undefined>(err.context.code);
    } else if (err.context.type === "CREATE_THREAD_ERROR") {
      expectType<string>(err.context.roomId);
      expectType<string>(err.context.threadId);
      expectType<string>(err.context.commentId);
    } else {
      // Not going to list them all...
    }
  });
}

// ---------------------------------------------------------

// useSelf()
{
  const me = ctx.useSelf();
  expectType<number | undefined>(me?.presence.cursor.x);
  expectError(me?.presence.nonexisting);

  expectType<string | undefined>(me?.info.name);
  expectType<number | undefined>(me?.info.age);
  expectError(me?.info.nonexisting);
}

// useSelf() (suspense)
{
  const me = ctx.suspense.useSelf();
  expectType<number>(me.presence.cursor.x);
  expectError(me.presence.nonexisting);

  expectType<string>(me.info.name);
  expectType<number>(me.info.age);
  expectError(me.info.nonexisting);
}

// ---------------------------------------------------------

// The useMutation() hook
{
  expectType<(a: number, b: boolean) => "hi">(
    ctx.useMutation((mut, _a: number, _b: boolean) => {
      expectType<number>(mut.self.presence.cursor.x);
      expectError(mut.self.presence.nonexisting);
      expectType<string>(mut.self.info.name);
      expectType<number>(mut.self.info.age);
      expectError(mut.self.info.nonexisting);

      expectType<number>(mut.others[0]!.presence.cursor.x);
      expectError(mut.others[0]!.presence.nonexisting);
      expectType<string>(mut.others[0]!.info.name);
      expectType<number>(mut.others[0]!.info.age);
      expectError(mut.others[0]!.info.nonexisting);

      expectType<string | undefined>(mut.storage.get("animals").get(0));
      expectType<number | undefined>(mut.storage.get("scores").get("one"));
      expectType<number>(mut.storage.get("person").get("age"));
      expectError(mut.storage.get("nonexisting"));
      expectType<void>(mut.setMyPresence({ cursor: { x: 0, y: 0 } }));
      expectError(mut.setMyPresence({ nonexisting: 123 }));

      return "hi" as const;
    }, [])
  );
}

// The useMutation() hook (suspense)
{
  expectType<(a: number, b: boolean) => "hi">(
    ctx.suspense.useMutation((mut, _a: number, _b: boolean) => {
      expectType<number>(mut.self.presence.cursor.x);
      expectError(mut.self.presence.nonexisting);
      expectType<string>(mut.self.info.name);
      expectType<number>(mut.self.info.age);
      expectError(mut.self.info.nonexisting);

      expectType<number>(mut.others[0]!.presence.cursor.x);
      expectError(mut.others[0]!.presence.nonexisting);
      expectType<string>(mut.others[0]!.info.name);
      expectType<number>(mut.others[0]!.info.age);
      expectError(mut.others[0]!.info.nonexisting);

      expectType<string | undefined>(mut.storage.get("animals").get(0));
      expectType<number | undefined>(mut.storage.get("scores").get("one"));
      expectType<number>(mut.storage.get("person").get("age"));
      expectError(mut.storage.get("nonexisting"));
      expectType<void>(mut.setMyPresence({ cursor: { x: 0, y: 0 } }));
      expectError(mut.setMyPresence({ nonexisting: 123 }));

      return "hi" as const;
    }, [])
  );
}

// ---------------------------------------------------------

// The useUser() hook
{
  {
    const { user, error, isLoading } = ctx.useUser("user-id");
    //                                 ^^^ [1]
    expectType<boolean>(isLoading);
    expectType<string | undefined>(user?.name);
    expectType<number | undefined>(user?.age);
    expectType<Error | undefined>(error);
  }
  {
    const { user, error, isLoading } = lbctx.useUser("user-id");
    //                                 ^^^^^ [2]
    expectType<boolean>(isLoading);
    expectType<string | undefined>(user?.name);
    expectType<number | undefined>(user?.age);
    expectType<Error | undefined>(error);
  }
}

// The useUser() hook (suspense)
{
  {
    const { user, error, isLoading } = ctx.suspense.useUser("user-id");
    //                                 ^^^^^^^^^^^^ [3]
    expectType<false>(isLoading);
    expectType<string>(user.name);
    expectType<number>(user.age);
    expectType<undefined>(error);
  }
  {
    const { user, error, isLoading } = lbctx.suspense.useUser("user-id");
    //                                 ^^^^^^^^^^^^^^ [4]
    expectType<false>(isLoading);
    expectType<string>(user.name);
    expectType<number>(user.age);
    expectType<undefined>(error);
  }
}

// ---------------------------------------------------------

// The useRoomInfo() hook
{
  {
    const { info, error, isLoading } = ctx.useRoomInfo("room-id");
    //                                 ^^^ [1]
    expectType<boolean>(isLoading);
    expectType<string | undefined>(info?.name);
    expectType<string | undefined>(info?.url);
    expectType<Json | undefined>(info?.nonexisting);
    expectType<Error | undefined>(error);
  }
  {
    const { info, error, isLoading } = lbctx.useRoomInfo("room-id");
    //                                 ^^^^^ [2]
    expectType<boolean>(isLoading);
    expectType<string | undefined>(info?.name);
    expectType<string | undefined>(info?.url);
    expectType<Json | undefined>(info?.nonexisting);
    expectType<Error | undefined>(error);
  }
}

// The useRoomInfo() hook (suspense)
{
  {
    const { info, error, isLoading } = ctx.suspense.useRoomInfo("room-id");
    //                                 ^^^^^^^^^^^^ [3]
    expectType<false>(isLoading);
    expectType<string | undefined>(info.name);
    expectType<string | undefined>(info.url);
    expectType<Json | undefined>(info.nonexisting);
    expectType<undefined>(error);
  }
  {
    const { info, error, isLoading } = lbctx.suspense.useRoomInfo("room-id");
    //                                 ^^^^^^^^^^^^^^ [4]
    expectType<false>(isLoading);
    expectType<string | undefined>(info.name);
    expectType<string | undefined>(info.url);
    expectType<Json | undefined>(info.nonexisting);
    expectType<undefined>(error);
  }
}

// ---------------------------------------------------------

// The useCreateThread() hook
{
  {
    const untypedCtx = createRoomContext(client);
    const createThread = untypedCtx.useCreateThread();
    //                   ^^^^^^^^^^ [1]
    expectError(createThread({}));

    const thread1 = createThread({
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
    });

    expectType<"thread">(thread1.type);
    expectType<string>(thread1.id);
    expectType<string>(thread1.roomId);
    expectType<"comment">(thread1.comments[0]!.type);
    expectType<string>(thread1.comments[0]!.id);
    expectType<string>(thread1.comments[0]!.threadId);

    expectType<string | number | boolean | undefined>(thread1.metadata.color);

    // But... creating a thread _with_ metadata is now an error
    const thread2 = createThread({
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
      metadata: { foo: "bar" },
    });

    expectType<string>(thread2.id);
  }

  {
    const createThread = ctx.useCreateThread();
    //                   ^^^ [2]
    expectError(createThread({})); // no body = error

    // No metadata = error
    expectError(
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

    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<"comment">(thread.comments[0]!.type);
    expectType<string>(thread.comments[0]!.id);
    expectType<string>(thread.comments[0]!.threadId);

    expectType<"red" | "blue">(thread.metadata.color);
  }
}

// The useCreateThread() hook (suspense)
{
  {
    const untypedCtx = createRoomContext(client);
    const createThread = untypedCtx.suspense.useCreateThread();
    //                   ^^^^^^^^^^^^^^^^^^^ [3]
    expectError(createThread({}));

    const thread1 = createThread({
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
    });

    expectType<"thread">(thread1.type);
    expectType<string>(thread1.id);
    expectType<string>(thread1.roomId);
    expectType<"comment">(thread1.comments[0]!.type);
    expectType<string>(thread1.comments[0]!.id);
    expectType<string>(thread1.comments[0]!.threadId);

    expectType<string | number | boolean | undefined>(thread1.metadata.color);

    const thread2 = createThread({
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
      metadata: { foo: "bar" },
    });

    expectType<string>(thread2.id);
  }

  {
    const createThread = ctx.suspense.useCreateThread();
    //                   ^^^^^^^^^^^^ [4]
    expectError(createThread({})); // no body = error

    // No metadata = error
    expectError(
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

    expectType<"thread">(thread.type);
    expectType<string>(thread.id);
    expectType<string>(thread.roomId);
    expectType<"comment">(thread.comments[0]!.type);
    expectType<string>(thread.comments[0]!.id);
    expectType<string>(thread.comments[0]!.threadId);

    expectType<"red" | "blue">(thread.metadata.color);
  }
}

// ---------------------------------------------------------

// The useEditThreadMetadata() hook
{
  {
    const untypedCtx = createRoomContext(client);
    const editMetadata = untypedCtx.useEditThreadMetadata();
    //                   ^^^^^^^^^^ [1]
    expectError(editMetadata({}));

    expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
    expectType<void>(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
    );
    expectType<void>(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
    );
  }

  {
    const editMetadata = ctx.useEditThreadMetadata();
    //                   ^^^ [2]
    expectError(editMetadata({})); // no body = error

    expectError(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
    );
    expectError(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
    );

    expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
    expectType<void>(
      editMetadata({
        threadId: "th_xxx",
        metadata: { color: "red", pinned: null },
      })
    );
    expectError(
      editMetadata({ threadId: "th_xxx", metadata: { color: null } }) // Color isn't optional so cannot be wiped
    );
  }
}

// The useEditThreadMetadata() hook (suspense)
{
  {
    const untypedCtx = createRoomContext(client);
    const editMetadata = untypedCtx.suspense.useEditThreadMetadata();
    //                   ^^^^^^^^^^^^^^^^^^^ [3]
    expectError(editMetadata({}));

    expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
    expectType<void>(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
    );
    expectType<void>(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
    );
  }

  {
    const editMetadata = ctx.suspense.useEditThreadMetadata();
    //                   ^^^^^^^^^^^^ [4]
    expectError(editMetadata({})); // no body = error

    expectError(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: null } })
    );
    expectError(
      editMetadata({ threadId: "th_xxx", metadata: { nonexisting: 123 } })
    );

    expectType<void>(editMetadata({ threadId: "th_xxx", metadata: {} }));
    expectType<void>(
      editMetadata({
        threadId: "th_xxx",
        metadata: { color: "red", pinned: null },
      })
    );
    expectError(
      editMetadata({ threadId: "th_xxx", metadata: { color: null } }) // Color isn't optional so cannot be wiped
    );
  }
}

// ---------------------------------------------------------

// The useCreateComment() hook
{
  {
    const createComment = ctx.useCreateComment();
    expectError(createComment({}));

    const comment = createComment({
      threadId: "th_xxx",
      body: {
        version: 1,
        content: [{ type: "paragraph", children: [{ text: "hi" }] }],
      },
    });

    expectType<"comment">(comment.type);
    expectType<string>(comment.id);
    expectType<string>(comment.threadId);
  }
}

// The useCreateComment() hook (suspense)
{
  const createComment = ctx.suspense.useCreateComment();
  expectError(createComment({}));

  const comment = createComment({
    threadId: "th_xxx",
    body: {
      version: 1,
      content: [{ type: "paragraph", children: [{ text: "hi" }] }],
    },
  });

  expectType<"comment">(comment.type);
  expectType<string>(comment.id);
  expectType<string>(comment.threadId);
}

// ---------------------------------------------------------

// The useEditComment() hook
{
  const editComment = ctx.useEditComment();
  expectError(editComment({}));

  expectType<void>(
    editComment({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      body: { version: 1, content: [] },
    })
  );
}

// The useEditComment() hook (suspense)
{
  const editComment = ctx.suspense.useEditComment();
  expectError(editComment({}));

  expectType<void>(
    editComment({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      body: { version: 1, content: [] },
    })
  );
}

// ---------------------------------------------------------

// The useDeleteComment() hook
{
  const deleteComment = ctx.useDeleteComment();

  expectError(deleteComment({}));
  expectError(deleteComment({ threadId: "th_xxx" }));
  expectError(deleteComment({ commentId: "co_xxx" }));

  expectType<void>(deleteComment({ threadId: "th_xxx", commentId: "co_xxx" }));
}

// The useDeleteComment() hook (suspense)
{
  const deleteComment = ctx.suspense.useDeleteComment();

  expectError(deleteComment({}));
  expectError(deleteComment({ threadId: "th_xxx" }));
  expectError(deleteComment({ commentId: "co_xxx" }));

  expectType<void>(deleteComment({ threadId: "th_xxx", commentId: "co_xxx" }));
}

// ---------------------------------------------------------

// The useAddReaction() hook
{
  const addReaction = ctx.useAddReaction();

  expectError(addReaction({}));
  expectError(addReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    addReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// The useAddReaction() hook (suspense)
{
  const addReaction = ctx.suspense.useAddReaction();

  expectError(addReaction({}));
  expectError(addReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(addReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    addReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// ---------------------------------------------------------

// The useRemoveReaction() hook
{
  const removeReaction = ctx.useRemoveReaction();

  expectError(removeReaction({}));
  expectError(removeReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    removeReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// The useRemoveReaction() hook (suspense)
{
  const removeReaction = ctx.suspense.useRemoveReaction();

  expectError(removeReaction({}));
  expectError(removeReaction({ threadId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ commentId: "th_xxx", emoji: "👍" }));
  expectError(removeReaction({ threadId: "th_xxx", commentId: "th_xxx" }));

  expectType<void>(
    removeReaction({
      threadId: "th_xxx",
      commentId: "cm_xxx",
      emoji: "👍",
    })
  );
}

// ---------------------------------------------------------

// The useInboxNotifications() hook
{
  const result = lbctx.useInboxNotifications();
  expectType<boolean>(result.isLoading);
  expectType<Error | undefined>(result.error);
  expectType<("thread" | "textMention" | `$${string}`)[] | undefined>(
    result.inboxNotifications?.map((ibn) => ibn.kind)
  );
  expectType<(string | undefined)[] | undefined>(
    result.inboxNotifications?.map((ibn) => ibn.roomId)
  );
}

// The useInboxNotifications() hook (suspense)
{
  const result = lbctx.suspense.useInboxNotifications();
  expectType<false>(result.isLoading);
  expectType<undefined>(result.error);
  expectType<("thread" | "textMention" | `$${string}`)[]>(
    result.inboxNotifications?.map((ibn) => ibn.kind)
  );
  expectType<(string | undefined)[]>(
    result.inboxNotifications?.map((ibn) => ibn.roomId)
  );
}

// ---------------------------------------------------------

// The useInboxNotificationThread() hook
{
  const result = lbctx.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<"red" | "blue">(result.metadata.color);
  expectError(result.metadata.nonexisting);
}

// The useInboxNotificationThread() hook (suspense)
{
  const result = lbctx.suspense.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<"red" | "blue">(result.metadata.color);
  expectError(result.metadata.nonexisting);
}

// ---------------------------------------------------------

// The useMarkInboxNotificationAsRead() hook
{
  const markRead = lbctx.useMarkInboxNotificationAsRead();
  expectType<void>(markRead("in_xxx"));
}

// The useMarkInboxNotificationAsRead() hook (suspense)
{
  const markRead = lbctx.suspense.useMarkInboxNotificationAsRead();
  expectType<void>(markRead("in_xxx"));
}

// ---------------------------------------------------------

// The useMarkAllInboxNotificationsAsRead() hook
{
  const markAllRead = lbctx.useMarkAllInboxNotificationsAsRead();
  expectType<void>(markAllRead());
}

// The useMarkAllInboxNotificationsAsRead() hook (suspense)
{
  const markAllRead = lbctx.suspense.useMarkAllInboxNotificationsAsRead();
  expectType<void>(markAllRead());
}

// ---------------------------------------------------------

// The useDeleteInboxNotification() hook
{
  const deleteNotification = lbctx.useDeleteInboxNotification();
  expectType<void>(deleteNotification("in_xxx"));
}

// The useDeleteInboxNotification() hook (suspense)
{
  const deleteNotification = lbctx.suspense.useDeleteInboxNotification();
  expectType<void>(deleteNotification("in_xxx"));
}

// ---------------------------------------------------------

// The useDeleteAllInboxNotifications() hook
{
  const deleteAllNotifications = lbctx.useDeleteAllInboxNotifications();
  expectType<void>(deleteAllNotifications());
}

// The useDeleteAllInboxNotifications() hook (suspense)
{
  const deleteAllNotifications =
    lbctx.suspense.useDeleteAllInboxNotifications();
  expectType<void>(deleteAllNotifications());
}

// ---------------------------------------------------------

// The useUnreadInboxNotificationsCount() hook
{
  const { count, error, isLoading } = lbctx.useUnreadInboxNotificationsCount();
  expectType<boolean>(isLoading);
  expectType<number | undefined>(count);
  expectType<Error | undefined>(error);
}

// The useUnreadInboxNotificationsCount() hook (suspense)
{
  const { count, error, isLoading } =
    lbctx.suspense.useUnreadInboxNotificationsCount();
  expectType<false>(isLoading);
  expectType<number>(count);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useSyncStatus() hook
{
  const status = lbctx.useSyncStatus();
  expectType<"synchronizing" | "synchronized">(status);
}
{
  const status = lbctx.suspense.useSyncStatus();
  expectType<"synchronizing" | "synchronized">(status);
}
{
  const status = ctx.useSyncStatus();
  expectType<"synchronizing" | "synchronized">(status);
}
{
  const status = ctx.suspense.useSyncStatus();
  expectType<"synchronizing" | "synchronized">(status);
}

// ---------------------------------------------------------
// the useNotificationSettings() hook
{
  const [{ isLoading, error, settings }, update] =
    lbctx.useNotificationSettings();
  expectType<boolean>(isLoading);
  expectType<Error | undefined>(error);
  expectType<NotificationSettings | undefined>(settings);
  expectType<void>(update({})); // empty {} because of partial definition
}
// the useNotificationSettings() hook suspense
{
  const [{ isLoading, error, settings }, update] =
    lbctx.suspense.useNotificationSettings();
  expectType<boolean>(isLoading);
  expectType<Error | undefined>(error);
  expectType<NotificationSettings | undefined>(settings);
  expectType<void>(update({})); // empty {} because of partial definition
}
// ---------------------------------------------------------
