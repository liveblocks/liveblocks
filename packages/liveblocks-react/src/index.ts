import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";

detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export { CreateThreadError, DeleteCommentError } from "./comments/errors";
export {
  createLiveblocksContext,
  useLiveblocksContextBundle,
} from "./liveblocks";
export {
  createRoomContext,
  OnCreateThreadCallbackContext,
  OnDeleteThreadCallbackContext,
  useRoomContextBundle,
} from "./room";
export { useSharedContextBundle } from "./shared";
export type { MutationContext, UseThreadsOptions } from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";
