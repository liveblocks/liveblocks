/* eslint-disable */
// @ts-nocheck
import type { Json, JsonObject, LsonObject } from "@liveblocks/client";
import { User, Room } from "@liveblocks/client";

interface Settings {
  currentUser: User;
  currentRoom: Room;
}

function callback(others: readonly User[]) {
  // Body
}

function f<R extends Room>(room: R) {
  // Body
}

const specificRoom = {} as Room;
const opaqueRoom = {} as Room;
