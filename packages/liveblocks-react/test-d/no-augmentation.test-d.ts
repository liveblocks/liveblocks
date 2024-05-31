import type { BaseMetadata, Json } from "@liveblocks/client";
import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectAssignable, expectError, expectType } from "tsd";

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

// useRoom()
{
  const room = classic.useRoom();
  expectType<Json | undefined>(room.getPresence().cursor);
  expectType<Json | undefined>(room.getPresence().notAPresenceField);
}

// useRoom() (suspense)
{
  const room = suspense.useRoom();
  expectType<Json | undefined>(room.getPresence().cursor);
  expectType<Json | undefined>(room.getPresence().notAPresenceField);
}

// ---------------------------------------------------------

// useSelf()
{
  const me = classic.useSelf();
  expectType<Json | undefined>(me?.presence.cursor);
  expectType<Json | undefined>(me?.presence.notAPresenceField);
}

// useSelf() (suspense)
{
  const me = suspense.useSelf();
  expectType<Json | undefined>(me.presence.cursor);
  expectType<Json | undefined>(me.presence.notAPresenceField);
}

// useSelf(selector)
{
  const x = classic.useSelf((me) => me.presence.cursor);
  expectType<Json | undefined | null>(x);
}

// useSelf(selector) (suspense)
{
  const x = suspense.useSelf((me) => me.presence.cursor);
  expectType<Json | undefined>(x);
}

// ---------------------------------------------------------

// useOthers()
{
  const others = classic.useOthers();
  expectType<Json | undefined>(others[13].presence.cursor);
  expectType<boolean>(others[0].canWrite);
}

// useOthers() (suspense)
{
  const others = suspense.useOthers();
  expectType<Json | undefined>(others[13].presence.cursor);
  expectType<boolean>(others[0].canWrite);
}

// useOthers(selector)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor)
  );
  expectType<(Json | undefined)[]>(xs);
}

// useOthers(selector) (suspense)
{
  const num = classic.useOthers((others) => others.length);
  expectType<number>(num);

  const xs = classic.useOthers((others) =>
    others.map((o) => o.presence.cursor)
  );
  expectType<(Json | undefined)[]>(xs);
}

// useOthers(selector, eq)
{
  const xs = classic.useOthers(
    (others) => others.map((o) => o.presence.cursor),
    classic.shallow
  );
  expectType<(Json | undefined)[]>(xs);
}

// useOthers(selector, eq) (suspense)
{
  const xs = suspense.useOthers(
    (others) => others.map((o) => o.presence.cursor),
    suspense.shallow
  );
  expectType<(Json | undefined)[]>(xs);
}

// ---------------------------------------------------------

// useBroadcastEvent()
{
  const broadcast = classic.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  broadcast({ type: "left", userId: "1234" });
  broadcast({ a: [], b: "", c: 123, d: false, e: undefined, f: null }); // arbitrary JSON
  expectError(broadcast({ notSerializable: new Date() }));
  expectError(broadcast(new Date()));
}

// useBroadcastEvent() (suspense)
{
  const broadcast = suspense.useBroadcastEvent();
  broadcast({ type: "emoji", emoji: "😍" });
  broadcast({ type: "left", userId: "1234" });
  broadcast({ a: [], b: "", c: 123, d: false, e: undefined, f: null }); // arbitrary JSON
  expectError(broadcast({ notSerializable: new Date() }));
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

// ---------------------------------------------------------

// The useInboxNotificationThread() hook
{
  const result = classic.useInboxNotificationThread("in_xxx");
  expectType<"thread">(result.type);
  expectType<string>(result.roomId);
  expectAssignable<unknown[]>(result.comments);
  expectType<BaseMetadata>(result.metadata);
  expectType<string | number | boolean | undefined>(result.metadata.color);
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
  expectType<BaseMetadata>(result.metadata);
  expectType<string | number | boolean | undefined>(result.metadata.color);
  expectType<string | number | boolean | undefined>(
    result.metadata.nonexisting
  );
}
