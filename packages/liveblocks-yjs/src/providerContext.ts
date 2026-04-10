import type { OpaqueRoom } from "@liveblocks/core";
import { Doc } from "yjs";

import { LiveblocksYjsProvider, type ProviderOptions } from "./provider";

/* NOTE:
      the purpose of the providersMap is to keep the same provider alive across renders
      re-instantiating the provider when the room hasn't changed can cause the yjs doc state to be out of sync
      with liveblocks yjs state. In this instance, we can just check if the room has changed, because the instance
      from useRoom will be referentially equal to the previous instance.
*/
const providersMap = new WeakMap<OpaqueRoom, LiveblocksYjsProvider>();

/**
 * Get a LiveblocksYjsProvider for a room.
 * @param room - The room to get the provider for.
 * @param options - The options for the provider.
 * @returns A LiveblocksYjsProvider for the room.
 */
const getYjsProviderForRoom = (
  room: OpaqueRoom,
  options: ProviderOptions = {},
  forceNewProvider: boolean = false
): LiveblocksYjsProvider => {
  const provider = providersMap.get(room);
  if (provider !== undefined) {
    if (!forceNewProvider) {
      return provider;
    }
    // we're going to get a new provider, so we need to destroy the old one
    provider.destroy();
    providersMap.delete(room);
  }
  const doc = new Doc();
  const newProvider = new LiveblocksYjsProvider(room, doc, options);

  room.events.roomWillDestroy.subscribeOnce(() => {
    newProvider.destroy();
  });
  providersMap.set(room, newProvider);
  return newProvider;
};

export { getYjsProviderForRoom };
