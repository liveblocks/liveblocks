import type { Json } from "@liveblocks/client";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectAssignable, expectError, expectType } from "tsd";

//
// User-provided type augmentations
//
declare global {
  namespace Liveblocks {
    interface Presence {
      cursor: { x: number; y: number };
    }

    interface UserMeta {
      info: {
        name: string;
        age: number;
      };
    }

    //
    // TODO Ideally support using union types here, somehow.
    // Maybe this could work?
    //
    // interface RoomEvents {
    //   events:
    //     | { type: "emoji"; emoji: string }
    //     | { type: "leave"; userId: string };
    // }
    //
    interface RoomEvent {
      type: "emoji";
      emoji: string;
    }

    interface ThreadMetadata {
      color: "red" | "blue";
    }
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
  expectType<Json | undefined>(room.getPresence().nonexisting);
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectType<Json | undefined>(room.getPresence().nonexisting);
}

// ---------------------------------------------------------

// useSelf()
{
  const me = classic.useSelf();
  expectType<number | undefined>(me?.presence.cursor.x);
  expectType<number | undefined>(me?.presence.cursor.y);
  expectType<Json | undefined>(me?.presence.nonexisting);

  expectType<string | undefined>(me?.info.name);
  expectType<number | undefined>(me?.info.age);
  expectError(me?.info.nonexisting);
}

// useSelf() (suspense)
{
  const me = suspense.useSelf();
  expectType<number>(me.presence.cursor.x);
  expectType<number>(me.presence.cursor.y);
  expectType<Json | undefined>(me.presence.nonexisting);

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
  expectType<string | undefined>(user?.avatar);
  expectType<Json | undefined>(user?.age);
  expectType<Json | undefined>(user?.anyOtherProp);
  expectType<Error | undefined>(error);
}

// The useUser() hook (suspense)
{
  const { user, error, isLoading } = suspense.useUser("user-id");
  expectType<false>(isLoading);
  expectType<string | undefined>(user?.name);
  expectType<string | undefined>(user?.avatar);
  expectType<Json | undefined>(user?.age);
  expectType<Json | undefined>(user?.anyOtherProp);
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
  expectType<string | number | boolean | undefined>(
    result.metadata.nonexisting
  );
}

// The useInboxNotificationThread() hook (suspense)
{
  const result = suspense.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<"red" | "blue">(result.metadata.color);
  expectType<string | number | boolean | undefined>(
    result.metadata.nonexisting
  );
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
