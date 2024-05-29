import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";
detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export {
  createLiveblocksContext,
  useClient,
  useLiveblocksContextBundle,
  useLiveblocksContextBundleOrNull,
} from "./liveblocks";
export { useSharedContextBundle } from "./shared";
export type { MutationContext, UseThreadsOptions } from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";

// Export all the top-level hooks
export {
  createRoomContext,
  useRoomContextBundle,
  useBatch,
  useBroadcastEvent,
  useOthersListener,
  useRoom,
  useStatus,
  useAddReaction,
  useMutation,
  useCreateThread,
  useEditThreadMetadata,
  useEventListener,
  useMyPresence,
  useStorageRoot,
  useUpdateMyPresence,
} from "./room";

// Export the classic (non-Suspense) versions of our hooks
// (This part differs from src/suspense.ts)
export {
  useOthersConnectionIds,
  useOthersMapped,
  useThreads,
  useOther,
  useOthers,
  useStorage,
  useSelf,
} from "./room";
