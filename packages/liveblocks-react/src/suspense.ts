/* eslint-disable simple-import-sort/exports */
import { detectDupes } from "@liveblocks/core";

import { PKG_FORMAT, PKG_NAME, PKG_VERSION } from "./version";
detectDupes(PKG_NAME, PKG_VERSION, PKG_FORMAT);

export { ClientSideSuspense } from "./ClientSideSuspense";
export type {
  MutationContext,
  UseSendAiMessageOptions,
  UseThreadsOptions,
} from "./types";

// Re-exports from @liveblocks/client, for convenience
export type { Json, JsonObject } from "@liveblocks/client";
export { shallow, isNotificationChannelEnabled } from "@liveblocks/client";

// Export all the top-level hooks
export { ClientContext, RoomContext, useClient } from "./contexts";
export { RegisterAiKnowledge, RegisterAiTool } from "./ai";
export type { RegisterAiKnowledgeProps, RegisterAiToolProps } from "./types/ai";
export {
  LiveblocksProvider,
  useInboxNotificationThread,
  useMarkAllInboxNotificationsAsRead,
  useMarkInboxNotificationAsRead,
  useDeleteAllInboxNotifications,
  useDeleteInboxNotification,
  useUpdateNotificationSettings,
  useCreateAiChat,
  useDeleteAiChat,
  useSendAiMessage,
  useSyncStatus,
  useErrorListener,
} from "./liveblocks";
export {
  RoomProvider,
  useAddReaction,
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
  useUpdateRoomSubscriptionSettings,
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
  useAttachmentUrlSuspense as useAttachmentUrl,
  useHistoryVersionsSuspense as useHistoryVersions,
  useRoomSubscriptionSettingsSuspense as useRoomSubscriptionSettings,
} from "./room";
export {
  useInboxNotificationsSuspense as useInboxNotifications,
  useNotificationSettingsSuspense as useNotificationSettings,
  useRoomInfoSuspense as useRoomInfo,
  useGroupInfoSuspense as useGroupInfo,
  useUnreadInboxNotificationsCountSuspense as useUnreadInboxNotificationsCount,
  useUserSuspense as useUser,
  useUserThreadsSuspense_experimental as useUserThreads_experimental,
  useAiChatsSuspense as useAiChats,
  useAiChatMessagesSuspense as useAiChatMessages,
  useAiChatSuspense as useAiChat,
} from "./liveblocks";
