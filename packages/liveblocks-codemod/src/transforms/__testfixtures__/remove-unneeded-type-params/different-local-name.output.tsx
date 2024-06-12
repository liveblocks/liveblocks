/* eslint-disable */
// @ts-nocheck
import type { Json, JsonObject, LsonObject } from "@liveblocks/client";
import { User as User1, Room as Room2 } from "@liveblocks/client";

interface Settings {
  currentUser: User1;
  currentRoom: Room2;
}

function callback(others: readonly User1[]) {
  // Body
}

function f<R extends Room2>(room: R) {
  // Body
}

const specificRoom = {} as Room2;
const opaqueRoom = {} as Room2;
