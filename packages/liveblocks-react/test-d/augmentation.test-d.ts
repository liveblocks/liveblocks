import type { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectAssignable, expectError, expectType } from "tsd";

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
  }
}

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

// useRoom()
{
  const room = classic.useRoom();
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectError(room.getPresence().nonexisting);
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectError(room.getPresence().nonexisting);
}

// ---------------------------------------------------------

// useSelf()
{
  const me = classic.useSelf();
  expectType<number | undefined>(me?.presence.cursor.x);
  expectType<number | undefined>(me?.presence.cursor.y);
  expectError(me?.presence.nonexisting);

  expectType<string | undefined>(me?.info.name);
  expectType<number | undefined>(me?.info.age);
  expectError(me?.info.nonexisting);
}

// useSelf() (suspense)
{
  const me = suspense.useSelf();
  expectType<number>(me.presence.cursor.x);
  expectType<number>(me.presence.cursor.y);
  expectError(me.presence.nonexisting);

  expectType<string>(me.info.name);
  expectType<number>(me.info.age);
  expectError(me.info.nonexisting);
}

// useSelf(selector)
{
  const x = classic.useSelf((me) => me.presence.cursor.x);
  expectType<number | null>(x);
}

// useSelf(selector) (suspense)
{
  const x = suspense.useSelf((me) => me.presence.cursor.x);
  expectType<number>(x);
}

// ---------------------------------------------------------

// useOthers()
{
  const others = classic.useOthers();
  expectType<number>(others[13].presence.cursor.x);
  expectType<number>(others[42].presence.cursor.y);
  expectType<boolean>(others[0].canWrite);
}

// useOthers() (suspense)
{
  const others = suspense.useOthers();
  expectType<number>(others[13].presence.cursor.x);
  expectType<number>(others[42].presence.cursor.y);
  expectType<boolean>(others[0].canWrite);
}

// useOthers(selector)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor.x)
  );
  expectType<number[]>(xs);
}

// useOthers(selector) (suspense)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor.x)
  );
  expectType<number[]>(xs);
}

// useOthers(selector, eq)
{
  const xs = classic.useOthers(
    (others) => others.map((o) => o.presence.cursor.x),
    classic.shallow
  );
  expectType<number[]>(xs);
}

// useOthers(selector, eq) (suspense)
{
  const xs = suspense.useOthers(
    (others) => others.map((o) => o.presence.cursor.x),
    suspense.shallow
  );
  expectType<number[]>(xs);
}

// ---------------------------------------------------------

// The useMutation() hook
{
  expectType<(a: number, b: boolean) => "hi">(
    classic.useMutation((mut, _a: number, _b: boolean) => {
      expectType<number>(mut.self.presence.cursor.x);
      expectError(mut.self.presence.nonexisting);
      expectType<string>(mut.self.info.name);
      expectType<number>(mut.self.info.age);
      expectError(mut.self.info.nonexisting);

      expectType<number>(mut.others[0].presence.cursor.x);
      expectError(mut.others[0].presence.nonexisting);
      expectType<string>(mut.others[0].info.name);
      expectType<number>(mut.others[0].info.age);
      expectError(mut.others[0].info.nonexisting);

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
    suspense.useMutation((mut, _a: number, _b: boolean) => {
      expectType<number>(mut.self.presence.cursor.x);
      expectError(mut.self.presence.nonexisting);
      expectType<string>(mut.self.info.name);
      expectType<number>(mut.self.info.age);
      expectError(mut.self.info.nonexisting);

      expectType<number>(mut.others[0].presence.cursor.x);
      expectError(mut.others[0].presence.nonexisting);
      expectType<string>(mut.others[0].info.name);
      expectType<number>(mut.others[0].info.age);
      expectError(mut.others[0].info.nonexisting);

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

// useBroadcastEvent()
{
  const broadcast = classic.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  // broadcast({ type: "leave", userId: "1234" });  // TODO Allow this using union types
  expectError(broadcast({ type: "i-do-not-exist" }));
  expectError(broadcast(new Date()));
}

// useBroadcastEvent() (suspense)
{
  const broadcast = suspense.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  // broadcast({ type: "leave", userId: "1234" });  // TODO Allow this using union types
  expectError(broadcast({ type: "i-do-not-exist" }));
  expectError(broadcast(new Date()));
}

// ---------------------------------------------------------

// The useUser() hook
{
  const { user, error, isLoading } = classic.useUser("user-id");
  expectType<boolean>(isLoading);
  expectType<string | undefined>(user?.name);
  expectError(user?.avatar);
  expectType<number | undefined>(user?.age);
  expectError(user?.anyOtherProp);
  expectType<Error | undefined>(error);
}

// The useUser() hook (suspense)
{
  const { user, error, isLoading } = suspense.useUser("user-id");
  expectType<false>(isLoading);
  expectType<string>(user.name);
  expectError(user.avatar);
  expectType<number>(user.age);
  expectError(user.anyOtherProp);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useRoomInfo() hook
{
  const { info, error, isLoading } = classic.useRoomInfo("room-id");
  expectType<boolean>(isLoading);
  expectType<string | undefined>(info?.name);
  expectType<string | undefined>(info?.url);
  expectType<Error | undefined>(error);
}

// The useRoomInfo() hook (suspense)
{
  const { info, error, isLoading } = suspense.useRoomInfo("room-id");
  expectType<false>(isLoading);
  expectType<string | undefined>(info.name);
  expectType<string | undefined>(info.url);
  expectType<undefined>(error);
}

// ---------------------------------------------------------

// The useCreateThread() hook
{
  const createThread = classic.useCreateThread();
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
  expectType<"comment">(thread.comments[0].type);
  expectType<string>(thread.comments[0].id);
  expectType<string>(thread.comments[0].threadId);

  expectType<"red" | "blue">(thread.metadata.color);
  expectError(thread.metadata.nonexisting);
}

// The useCreateThread() hook (suspense)
{
  const createThread = suspense.useCreateThread();
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
  expectType<"comment">(thread.comments[0].type);
  expectType<string>(thread.comments[0].id);
  expectType<string>(thread.comments[0].threadId);

  expectType<"red" | "blue">(thread.metadata.color);
  expectError(thread.metadata.nonexisting);
}

// ---------------------------------------------------------

// The useInboxNotifications() hook
{
  expectType<boolean>(classic.useInboxNotifications().isLoading);
  expectType<Error | undefined>(classic.useInboxNotifications().error);
  expectType<("thread" | `$${string}`)[] | undefined>(
    classic.useInboxNotifications().inboxNotifications?.map((ibn) => ibn.kind)
  );
  expectType<(string | undefined)[] | undefined>(
    classic.useInboxNotifications().inboxNotifications?.map((ibn) => ibn.roomId)
  );
}

// The useInboxNotifications() hook (suspense)
{
  expectType<false>(suspense.useInboxNotifications().isLoading);
  expectType<undefined>(suspense.useInboxNotifications().error);
  expectType<("thread" | `$${string}`)[]>(
    suspense.useInboxNotifications().inboxNotifications?.map((ibn) => ibn.kind)
  );
  expectType<(string | undefined)[]>(
    suspense
      .useInboxNotifications()
      .inboxNotifications?.map((ibn) => ibn.roomId)
  );
}

// ---------------------------------------------------------

// The useInboxNotificationThread() hook
{
  const result = classic.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<"red" | "blue">(result.metadata.color);
  expectError(result.metadata.nonexisting);
}

// The useInboxNotificationThread() hook (suspense)
{
  const result = suspense.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<"red" | "blue">(result.metadata.color);
  expectError(result.metadata.nonexisting);
}

// ---------------------------------------------------------

// The useMarkInboxNotificationAsRead() hook
{
  const markRead = classic.useMarkInboxNotificationAsRead();
  expectType<void>(markRead("in_xxx"));
}

// The useMarkInboxNotificationAsRead() hook (suspense)
{
  const markRead = suspense.useMarkInboxNotificationAsRead();
  expectType<void>(markRead("in_xxx"));
}

// ---------------------------------------------------------

// The useMarkAllInboxNotificationsAsRead() hook
{
  const markAllRead = classic.useMarkAllInboxNotificationsAsRead();
  expectType<void>(markAllRead());
}

// The useMarkAllInboxNotificationsAsRead() hook (suspense)
{
  const markAllRead = suspense.useMarkAllInboxNotificationsAsRead();
  expectType<void>(markAllRead());
}

// ---------------------------------------------------------

// The useUnreadInboxNotificationsCount() hook
{
  const { count, error, isLoading } =
    classic.useUnreadInboxNotificationsCount();
  expectType<boolean>(isLoading);
  expectType<number | undefined>(count);
  expectType<Error | undefined>(error);
}

// The useUnreadInboxNotificationsCount() hook (suspense)
{
  const { count, error, isLoading } =
    suspense.useUnreadInboxNotificationsCount();
  expectType<false>(isLoading);
  expectType<number>(count);
  expectType<undefined>(error);
}
