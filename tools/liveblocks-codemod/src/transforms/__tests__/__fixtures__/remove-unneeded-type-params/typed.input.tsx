/* eslint-disable */
// @ts-nocheck
import { type User as User1, type Room as Room1 } from "@liveblocks/client";
import type { User as User2, Room as Room2 } from "@liveblocks/client";
import { User as User3, Room as Room3 } from "@liveblocks/client";

interface Settings {
  user1: User1<Ha, Ha>;
  user2: User2<X, Y, Z>;
  user3: User3<X, Y, Z>;
  room1: Room1<One, Two>;
  room2: Room2<One, Two>;
  room3: Room3<One, Two>;
}
