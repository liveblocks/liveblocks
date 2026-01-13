import type { BaseMetadata } from "@liveblocks/client";
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
type ThreadMetadata = BaseMetadata;
type CommentMetadata = BaseMetadata;

type P = Presence;
type S = Storage;
type U = UserMeta;
type E = RoomEvent;
type TM = ThreadMetadata;
type CM = CommentMetadata;

const client = createClient<U>({ publicApiKey: "pk_whatever" });

// Test some Room types
const { room, leave } = client.enterRoom<P, S, E, TM, CM>("my-room", {
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
room.events.others.subscribe((event) => {
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
