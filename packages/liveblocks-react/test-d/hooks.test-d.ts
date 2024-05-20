import type { LiveList, Room, User } from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { expectType } from "tsd";

type MyPresence = { cursor: { x: number; y: number } | null };
type MyStorage = { animals: LiveList<string> };
type MyUserMeta = { id: string; info: { name: string } };
type MyRoomEvent = { type: "emoji"; value: string };

type P = MyPresence;
type S = MyStorage;
type U = MyUserMeta;
type E = MyRoomEvent;

const client = createClient({ publicApiKey: "pk_whatever" });

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
