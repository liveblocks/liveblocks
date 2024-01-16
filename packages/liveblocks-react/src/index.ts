import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export {
  createLiveblocksContext,
  useLiveblocksContextBundle,
} from "./liveblocks";
export { createRoomContext, useRoomContextBundle } from "./room";
// [comments-unread] TODO: We need to access `useSharedContextBundle` within the `@liveblocks/react-comments` default components but how do make this more hidden?
export { useSharedContextBundle } from "./shared";
export type { MutationContext } from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";
