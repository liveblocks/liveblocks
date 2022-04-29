import { JsonObject, LsonObject } from "@liveblocks/client";
import { createHooks, RoomProviderProps } from "./factory";

// If you import the hooks from this module directly, you cannot benefit from
// associating them with your custom Presence and/or Storage types. Our best
// shot is to let TypeScript know that these are JSON-serializable objects, but
// we know nothing about it until you provide your own custom types.
//
// The recommended practice is to switch your imports from:
//
//    import { RoomProvider, useOthers, useList, ... } from '@liveblocks/react';
//
// To:
//
//    import { createHooks } from '@liveblocks/react';
//    const { RoomProvider, useOthers, useList, ... } = createHooks<MyPresence, MyStorage>();
//                                                                  ^^^^^^^^^^  ^^^^^^^^^
//                                                                  Provide these types yourself!
//
type OpaquePresence = JsonObject;
type OpaqueStorage = LsonObject;

const {
  RoomProvider: RoomProvider_newAPI,
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
} = createHooks<OpaquePresence, OpaqueStorage>();

/**
 * Makes a Room available in the component hierarchy below.
 * When this component is unmounted, the current user leave the room.
 * That means that you can't have 2 RoomProvider with the same room id in your react tree.
 */
function RoomProvider<TStorage extends LsonObject>(
  props: RoomProviderProps<OpaquePresence, TStorage>
) {
  // NOTE: This weird definition is necessary for backward-compatibility. In
  // the "old" version, this type took only one type param, and it was
  // TStorage. In the new API, this type takes two type params, and the first
  // one is TPresence.
  return RoomProvider_newAPI(props);
}

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
