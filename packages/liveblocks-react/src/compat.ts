import { BasePresence, BaseStorage } from "@liveblocks/client";
import { createHooks } from "./factory";

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

const {
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
} = createHooks<BasePresence, BaseStorage>();

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
