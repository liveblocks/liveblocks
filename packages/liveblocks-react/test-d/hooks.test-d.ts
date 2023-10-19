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
