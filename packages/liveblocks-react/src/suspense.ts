import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";
detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export { useSharedContextBundle } from "./shared";
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
  useLiveblocksContextBundleOrNull,
  useInboxNotificationThread,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,

  // XXX TODO Add these here
  // useUser,
  // useRoomInfo,
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
} from "./room";

// Export the Suspense versions of our hooks
// (This part differs from src/index.ts)
export {
  useOtherSuspense as useOther,
  useOthersSuspense as useOthers,
  useOthersConnectionIdsSuspense as useOthersConnectionIds,
  useOthersMappedSuspense as useOthersMapped,
  useSelfSuspense as useSelf,
  useStorageSuspense as useStorage,
  useThreadsSuspense as useThreads,
} from "./room";

// XXX TODO Add these here
export {
  useInboxNotificationsSuspense as useInboxNotifications,
  // useUnreadInboxNotificationsCountSuspense as useUnreadInboxNotificationsCount,
} from "./liveblocks";
