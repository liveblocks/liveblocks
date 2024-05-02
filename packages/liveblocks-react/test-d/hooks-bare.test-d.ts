import type { Json } from "@liveblocks/client";
import { useRoom, useOthers /* etc etc */ } from "@liveblocks/react";
import { expectType } from "tsd";

// ---------------------------------------------------------
// Hook APIs
// ---------------------------------------------------------

const room = useRoom();

// When using imported hooks, without augmentation, the types are really generic
expectType<Json | undefined>(room.getPresence().cursor);
expectType<Json | undefined>(room.getPresence().notAPresenceField);

// ---------------------------------------------------------

const others = useOthers();
expectType<Json | undefined>(others[13].presence.cursor);
expectType<Json | undefined>(others[13].presence.notAPresenceField);
expectType<boolean>(others[0].isReadOnly);
