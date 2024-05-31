/* eslint-disable simple-import-sort/exports */
import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";
detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export type { MutationContext, UseThreadsOptions } from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";

// Export all the top-level hooks
export {
  createLiveblocksContext,
  LiveblocksProvider,
  useClient,
  useLiveblocksContextBundle,
  useInboxNotificationThread,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,

  // TODO Move these private APIs into another namespace eventually
  useLiveblocksContextBundleOrNull as useLiveblocksContextBundleOrNull__,
} from "./liveblocks";
export {
  createRoomContext,
  RoomContext,
  RoomProvider,
  useAddReaction,
  useBatch,
  useBroadcastEvent,
  useCanRedo,
  useCanUndo,
  useCreateComment,
  useCreateThread,
  useDeleteComment,
  useEditComment,
  useEditThreadMetadata,
  useErrorListener,
  useEventListener,
  useHistory,
  useLostConnectionListener,
  useMarkThreadAsRead,
  useMutation,
  useMyPresence,
  useOthersListener,
  useRedo,
  useRemoveReaction,
  useRoom,
  useRoomContextBundle,
  useRoomNotificationSettings,
  useStatus,
  useStorageRoot,
  useThreadSubscription,
  useUndo,
  useUpdateMyPresence,
  useUpdateRoomNotificationSettings,

  // Maybe we can eventually move these private APIs into another namespace
  // somehow, but making that decision later
  useRoomContextBundleOrNull as useRoomContextBundleOrNull__,
} from "./room";

// Export the classic (non-Suspense) versions of our hooks
// (This part differs from src/suspense.ts)
export {
  useOther,
  useOthers,
  useOthersConnectionIds,
  useOthersMapped,
  useSelf,
  useStorage,
  useThreads,
} from "./room";
export {
  useInboxNotifications,
  useRoomInfo,
  useUnreadInboxNotificationsCount,
  useUser,
} from "./liveblocks";
