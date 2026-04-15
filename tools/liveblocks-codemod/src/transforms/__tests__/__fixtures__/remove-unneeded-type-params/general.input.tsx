/* eslint-disable */
// @ts-nocheck
import type { Json, JsonObject, LsonObject } from "@liveblocks/client";
import { User, Room } from "@liveblocks/client";

interface Settings {
  currentUser: User;
  currentRoom: Room<One, Two>;
}

function callback(others: readonly User<MyPresence, MyUserMeta>[]) {
  // Body
}

function f<R extends Room<JsonObject, LsonObject, UserMeta, Json>>(room: R) {
  // Body
}

const specificRoom = {} as Room<Foo, Bar, Qux, Bazz, Mutt>;
const opaqueRoom = {} as Room<JsonObject, LsonObject, UserMeta, Json>;
