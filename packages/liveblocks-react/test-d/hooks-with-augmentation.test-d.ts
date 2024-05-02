import type { Json } from "@liveblocks/client";
import { useRoom, useOthers /* etc etc */ } from "@liveblocks/react";
import { expectType } from "tsd";

//
// User-provided type augmentations
//
declare module "@liveblocks/client" {
  interface GPresence {
    cursor: {
      x: number;
      y: number;
    };
  }
}

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

const room = useRoom();

// Global presence is now available
expectType<number>(room.getPresence().cursor.x);
expectType<number>(room.getPresence().cursor.y);
expectType<Json | undefined>(room.getPresence().notAPresenceField);

// ---------------------------------------------------------

const others = useOthers();
expectType<number>(others[13].presence.cursor.x);
expectType<number>(others[42].presence.cursor.y);
expectType<boolean>(others[0].isReadOnly);
