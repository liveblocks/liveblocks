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
  createLiveblocksContext,
  useClient,
  useInboxNotificationThread,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useDeleteAllInboxNotifications,
  useDeleteInboxNotification,
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
  useHistoryVersionData,
} from "./room";

export { useCommentsErrorListener, CreateThreadError } from "./room";
export { selectedThreads } from "./comments/lib/selected-threads";

// Export the classic (non-Suspense) versions of our hooks
// (This part differs from src/suspense.ts)
export {
  useOther,
  useOthers,
  useOthersConnectionIds,
  useOthersMapped,
  useSelf,
  useStorage,
  useStorageStatus,
  useThreads,
  useHistoryVersions,
} from "./room";
export {
  useInboxNotifications,
  useUserThreads_experimental as useUserThreads_experimental,
  useRoomInfo,
  useUnreadInboxNotificationsCount,
  useUser,
} from "./liveblocks";
