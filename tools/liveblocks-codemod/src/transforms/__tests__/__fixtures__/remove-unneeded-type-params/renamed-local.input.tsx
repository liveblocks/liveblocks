/* eslint-disable */
// @ts-nocheck
import type { Json, JsonObject, LsonObject } from "@liveblocks/client";
import { User as User1, Room as Room2 } from "@liveblocks/client";

interface Settings {
  currentUser: User1;
  currentRoom: Room2<One, Two>;
}

function callback(others: readonly User1<MyPresence, MyUserMeta>[]) {
  // Body
}

function f<R extends Room2<JsonObject, LsonObject, UserMeta, Json>>(room: R) {
  // Body
}

const specificRoom = {} as Room2<Foo, Bar, Qux, Bazz, Mutt>;
const opaqueRoom = {} as Room2<JsonObject, LsonObject, UserMeta, Json>;
