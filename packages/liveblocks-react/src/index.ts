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
export { shallow, isNotificationChannelEnabled } from "@liveblocks/client";

// Export all the top-level hooks
export { RegisterAiKnowledge } from "./ai";
export {
  ClientContext,
  createLiveblocksContext,
  LiveblocksProvider,
  useClient,
  useDeleteAllInboxNotifications,
  useDeleteInboxNotification,
  useErrorListener,
  useInboxNotificationThread,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useSyncStatus,
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
  useSubscribeToThread,
  useUnsubscribeFromThread,
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
  useStatus,
  useStorageRoot,
  useThreadSubscription,
  useUndo,
  useUpdateMyPresence,
  useUpdateRoomNotificationSettings,
  useUpdateRoomSubscriptionSettings,
  useHistoryVersionData,
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
  useStorageStatus,
  useThreads,
  useAttachmentUrl,
  useHistoryVersions,
  useRoomNotificationSettings,
  useRoomSubscriptionSettings,
} from "./room";
export {
  useInboxNotifications,
  useNotificationSettings,
  useUpdateNotificationSettings,
  useCreateAiChat,
  useDeleteAiChat,
  useSendAiMessage,
  useUserThreads_experimental as useUserThreads_experimental,
  useRoomInfo,
  useUnreadInboxNotificationsCount,
  useUser,
  useAiChats,
  useAiChatMessages,
} from "./liveblocks";
