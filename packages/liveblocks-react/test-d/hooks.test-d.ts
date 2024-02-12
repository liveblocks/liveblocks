import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  Room,
  User,
} from "@liveblocks/client";
import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { expectType } from "tsd";

type Presence = JsonObject;
type Storage = LsonObject;
type UserMeta = BaseUserMeta;
type RoomEvent = Json;

type P = Presence;
type S = Storage;
type U = UserMeta;
type E = RoomEvent;

const client = createClient({ publicApiKey: "pk_whatever" });

const ctx = createRoomContext<P, S, U, E>(client);

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

// The useRoom() hook
expectType<Room<P, S, U, E>>(ctx.useRoom());

// The useOthers() hook
expectType<readonly User<P, U>[]>(ctx.useOthers());

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
