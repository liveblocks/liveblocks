import type { Json } from "@liveblocks/client";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectError, expectType } from "tsd";

//
// User-provided type augmentations
//
declare global {
  namespace Liveblocks {
    interface Presence {
      cursor: { x: number; y: number };
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
  expectType<Json | undefined>(room.getPresence().notAPresenceField);
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<number>(room.getPresence().cursor.x);
  expectType<number>(room.getPresence().cursor.y);
  expectType<Json | undefined>(room.getPresence().notAPresenceField);
}

// ---------------------------------------------------------

// useSelf()
{
  const me = classic.useSelf();
  expectType<number | undefined>(me?.presence.cursor.x);
  expectType<number | undefined>(me?.presence.cursor.y);
  expectType<Json | undefined>(me?.presence.notAPresenceField);
}

// useSelf() (suspense)
{
  const me = suspense.useSelf();
  expectType<number>(me.presence.cursor.x);
  expectType<number>(me.presence.cursor.y);
  expectType<Json | undefined>(me.presence.notAPresenceField);
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

// // The useUser() hook
// {
//   expectType<boolean>(classic.useUser("1234").isLoading);
//   expectType<{ name: string } | undefined>(classic.useUser("1234").user);
// }
//
// // The useUser() hook (suspense)
// {
//   expectType<boolean>(suspense.useUser("1234").isLoading);
//   expectType<{ name: string } | undefined>(suspense.useUser("1234").user);
// }

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
