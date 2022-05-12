import type { JsonObject, LsonObject } from "@liveblocks/client";

import { create } from "./factory";

type OpaquePresence = JsonObject;
type OpaqueStorage = LsonObject;

const {
  RoomProvider: RoomProvider_,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useBroadcastEvent,
  useErrorListener,
  useEventListener,
  useSelf,
  useStorage,
  useMap,
  useList,
  useObject,
  useUndo,
  useRedo,
  useBatch,
  useHistory,
} = create<OpaquePresence, OpaqueStorage>();

// Fix type params to ensure types keep matching
// function RoomProvider<TStorage>
const RoomProvider = RoomProvider_;

export {
  RoomProvider,
  useRoom,
  useMyPresence,
  useUpdateMyPresence,
  useOthers,
  useBroadcastEvent,
  useErrorListener,
  useEventListener,
  useSelf,
  useStorage,
  useMap,
  useList,
  useObject,
  useUndo,
  useRedo,
  useBatch,
  useHistory,
};
