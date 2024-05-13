import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export {
  createLiveblocksContext,
  LiveblocksProvider,
  useClient,
  useLiveblocksContextBundle,
} from "./liveblocks";
export { createRoomContext, useRoomContextBundle } from "./room";
export { useSharedContextBundle } from "./shared";
export type { MutationContext, UseThreadsOptions } from "./types";

// Export hooks in a "normal" way, so they can be imported
export {} from // XXX This should eventually include _ALL_ hooks. I'm starting small here! 😅
// useRoom,
// useOthers,
// RoomProvider,
"./room";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";
