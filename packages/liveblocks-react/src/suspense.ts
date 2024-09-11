/* eslint-disable simple-import-sort/exports */
import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";
detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export type {
  MutationContext,
  UseStorageStatusOptions,
  UseThreadsOptions,
} from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow } from "@liveblocks/client";

// Export all the top-level hooks
export {
  ClientContext,
  LiveblocksProvider,
  useClient,
  useInboxNotificationThread,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useDeleteAllInboxNotifications,
  useDeleteInboxNotification,
} from "./liveblocks";
export {
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
  useDeleteThread,
  useEditComment,
  useEditThreadMetadata,
  useMarkThreadAsResolved,
  useMarkThreadAsUnresolved,
  useErrorListener,
  useEventListener,
  useHistory,
  useIsInsideRoom,
  useLostConnectionListener,
  useMarkThreadAsRead,
  useMutation,
  useMyPresence,
  useOthersListener,
  useRedo,
  useRemoveReaction,
  useRoom,
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
  useStorageStatusSuspense as useStorageStatus,
  useThreadsSuspense as useThreads,
  useHistoryVersionsSuspense as useHistoryVersions,
} from "./room";
export {
  useInboxNotificationsSuspense as useInboxNotifications,
  useRoomInfoSuspense as useRoomInfo,
  useUnreadInboxNotificationsCountSuspense as useUnreadInboxNotificationsCount,
  useUserSuspense as useUser,
  useUserThreadsSuspense_experimental as useUserThreads_experimental,
} from "./liveblocks";
