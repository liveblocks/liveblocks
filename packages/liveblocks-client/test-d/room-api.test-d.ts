import { createClient } from "@liveblocks/client";
import type {
  BaseUserMeta,
  Json,
  JsonObject,
  LsonObject,
  User,
} from "@liveblocks/client";
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

// Test some Room types
const { room, leave } = client.enterRoom<P, S, U, E>("my-room", {
  initialPresence: {},
});
expectType<string>(room.id);
expectType<void>(leave());

// "Others" events through classic subscribe function
room.subscribe("others", (others, event) => {
  expectType<readonly User<P, U>[]>(others);
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

// "Others" events through event hub API
room.events.others.subscribe(({ others, event }) => {
  expectType<readonly User<P, U>[]>(others);
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
