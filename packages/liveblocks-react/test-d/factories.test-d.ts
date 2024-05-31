import type {
  LiveList,
  LiveMap,
  LiveObject,
  Room,
  User,
} from "@liveblocks/client";
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

type MyRoomEvent = {
  type: "emoji";
  value: string;
};

type MyThreadMetadata = {
  color: "red" | "blue";
};

type P = MyPresence;
type S = MyStorage;
type U = MyUserMeta;
type E = MyRoomEvent;
type M = MyThreadMetadata;

const client = createClient({ publicApiKey: "pk_whatever" });

const lbctx = createLiveblocksContext<U, M>(client);
const ctx = createRoomContext<P, S, U, E>(client);

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

// The useRoom() hook
expectType<Room<P, S, U, E>>(ctx.useRoom());

// The presence hooks
expectType<P>(ctx.useSelf()!.presence);
expectType<readonly User<P, U>[]>(ctx.useOthers());
expectType<P>(ctx.useOthers()[0].presence);
expectType<P>(ctx.useOthersMapped((u) => u.presence)[0][1]);
expectType<readonly number[]>(ctx.useOthersConnectionIds());
expectType<P>(ctx.useOther(123, (o) => o.presence));
expectType<P>(ctx.useMyPresence()[0]);

// The presence hooks (suspense versions)
expectType<P>(ctx.suspense.useSelf().presence);
expectType<readonly User<P, U>[]>(ctx.suspense.useOthers());
expectType<P>(ctx.suspense.useOthers()[0].presence);
expectType<P>(ctx.suspense.useOthersMapped((u) => u.presence)[0][1]);
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

expectType<(a: number, b: boolean) => "hi">(
  ctx.useMutation((mut, _a: number, _b: boolean) => {
    expectType<User<MyPresence, MyUserMeta>>(mut.self);
    expectType<readonly User<MyPresence, MyUserMeta>[]>(mut.others);
    expectType<LiveObject<MyStorage>>(mut.storage);
    expectType<
      (p: Partial<MyPresence>, options?: { addToHistory: boolean }) => void
    >(mut.setMyPresence);
    return "hi" as const;
  }, [])
);

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

expectType<(a: number, b: boolean) => "hi">(
  ctx.suspense.useMutation((mut, _a: number, _b: boolean) => {
    expectType<User<MyPresence, MyUserMeta>>(mut.self);
    expectType<readonly User<MyPresence, MyUserMeta>[]>(mut.others);
    expectType<LiveObject<MyStorage>>(mut.storage);
    expectType<
      (p: Partial<MyPresence>, options?: { addToHistory: boolean }) => void
    >(mut.setMyPresence);
    return "hi" as const;
  }, [])
);

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

ctx.useErrorListener((err) => {
  expectType<string>(err.message);
  expectType<string | undefined>(err.stack);
  expectType<number>(err.code);
});

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
    expectType<Error | undefined>(error);
  }
  {
    const { info, error, isLoading } = lbctx.useRoomInfo("room-id");
    //                                 ^^^^^ [2]
    expectType<boolean>(isLoading);
    expectType<string | undefined>(info?.name);
    expectType<string | undefined>(info?.url);
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
    expectType<undefined>(error);
  }
  {
    const { info, error, isLoading } = lbctx.suspense.useRoomInfo("room-id");
    //                                 ^^^^^^^^^^^^^^ [4]
    expectType<false>(isLoading);
    expectType<string | undefined>(info.name);
    expectType<string | undefined>(info.url);
    expectType<undefined>(error);
  }
}

// ---------------------------------------------------------

// The useInboxNotifications() hook
{
  const result = lbctx.useInboxNotifications();
  expectType<boolean>(result.isLoading);
  expectType<Error | undefined>(result.error);
  expectType<("thread" | `$${string}`)[] | undefined>(
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
  expectType<("thread" | `$${string}`)[]>(
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
