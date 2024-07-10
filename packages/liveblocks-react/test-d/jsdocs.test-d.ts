import * as classic from "@liveblocks/react";
import * as suspense from "@liveblocks/react/suspense";
import { expectDocCommentIncludes } from "tsd";

// Empty string just to double-check that there _is_ a doc string at all
type _ = "";

type useSelfOverload1 =
  "Gets the current user once it is connected to the room.";
type useSelfOverload2 = "Extract arbitrary data based on the current user.";

const context = classic.createRoomContext({} as any);

expectDocCommentIncludes<useSelfOverload1>(context.useSelf());
expectDocCommentIncludes<useSelfOverload1>(classic.useSelf());
expectDocCommentIncludes<useSelfOverload1>(suspense.useSelf());

expectDocCommentIncludes<useSelfOverload2>(context.useSelf((x) => x));
expectDocCommentIncludes<useSelfOverload2>(classic.useSelf((x) => x));
expectDocCommentIncludes<useSelfOverload2>(suspense.useSelf((x) => x));

// expectDocCommentIncludes<_>(context.ClientSideSuspense);  // Does not exist
expectDocCommentIncludes<_>(classic.ClientSideSuspense({} as any));
expectDocCommentIncludes<_>(suspense.ClientSideSuspense({} as any));

// TODO: Check all of the below similarly
// context.createLiveblocksContext
// context.createRoomContext
// context.Json
// context.JsonObject
// context.LiveblocksProvider
// context.MutationContext
// context.RoomContext
// context.RoomProvider
// context.shallow
// context.useAddReaction
// context.useBatch
// context.useBroadcastEvent
// context.useCanRedo
// context.useCanUndo
// context.useClient
// context.useCreateComment
// context.useCreateThread
// context.useDeleteComment
// context.useEditComment
// context.useEditThreadMetadata
// context.useMarkThreadAsResolved
// context.useEditThreadAsUnresolved
// context.useErrorListener
// context.useEventListener
// context.useHistory
// context.useInboxNotifications
// context.useInboxNotificationThread
// context.useLostConnectionListener
// context.useMarkAllInboxNotificationsAsRead
// context.useMarkInboxNotificationAsRead
// context.useDeleteAllInboxNotifications
// context.useDeleteInboxNotification
// context.useMarkThreadAsRead
// context.useMutation
// context.useMyPresence
// context.useOther
// context.useOthers
// context.useOthersConnectionIds
// context.useOthersListener
// context.useOthersMapped
// context.useRedo
// context.useRemoveReaction
// context.useRoom
// context.useRoomInfo
// context.useRoomNotificationSettings
// context.useSelf
// context.useStatus
// context.useStorage
// context.useStorageRoot
// context.useThreads
// context.UseThreadsOptions
// context.useThreadSubscription
// context.useUndo
// context.useUnreadInboxNotificationsCount
// context.useUpdateMyPresence
// context.useUpdateRoomNotificationSettings
// context.useUser
//
// classic.createLiveblocksContext
// classic.createRoomContext
// classic.Json
// classic.JsonObject
// classic.LiveblocksProvider
// classic.MutationContext
// classic.RoomContext
// classic.RoomProvider
// classic.shallow
// classic.useAddReaction
// classic.useBatch
// classic.useBroadcastEvent
// classic.useCanRedo
// classic.useCanUndo
// classic.useClient
// classic.useCreateComment
// classic.useCreateThread
// classic.useDeleteComment
// classic.useEditComment
// classic.useEditThreadMetadata
// classic.useMarkThreadAsResolved
// classic.useEditThreadAsUnresolved
// classic.useErrorListener
// classic.useEventListener
// classic.useHistory
// classic.useInboxNotifications
// classic.useInboxNotificationThread
// classic.useLiveblocksContextBundleOrNull__
// classic.useLostConnectionListener
// classic.useMarkAllInboxNotificationsAsRead
// classic.useMarkInboxNotificationAsRead
// classic.useDeleteAllInboxNotifications
// classic.useDeleteInboxNotification
// classic.useMarkThreadAsRead
// classic.useMutation
// classic.useMyPresence
// classic.useOther
// classic.useOthers
// classic.useOthersConnectionIds
// classic.useOthersListener
// classic.useOthersMapped
// classic.useRedo
// classic.useRemoveReaction
// classic.useRoom
// classic.useRoomInfo
// classic.useRoomNotificationSettings
// classic.useSelf
// classic.useStatus
// classic.useStorage
// classic.useStorageRoot
// classic.useThreads
// classic.UseThreadsOptions
// classic.useThreadSubscription
// classic.useUndo
// classic.useUnreadInboxNotificationsCount
// classic.useUpdateMyPresence
// classic.useUpdateRoomNotificationSettings
// classic.useUser
//
// suspense.createLiveblocksContext
// suspense.createRoomContext
// suspense.Json
// suspense.JsonObject
// suspense.LiveblocksProvider
// suspense.MutationContext
// suspense.RoomContext
// suspense.RoomProvider
// suspense.shallow
// suspense.useAddReaction
// suspense.useBatch
// suspense.useBroadcastEvent
// suspense.useCanRedo
// suspense.useCanUndo
// suspense.useClient
// suspense.useCreateComment
// suspense.useCreateThread
// suspense.useDeleteComment
// suspense.useEditComment
// suspense.useEditThreadMetadata
// suspense.useMarkThreadAsResolved
// suspense.useEditThreadAsUnresolved
// suspense.useErrorListener
// suspense.useEventListener
// suspense.useHistory
// suspense.useInboxNotifications
// suspense.useInboxNotificationThread
// suspense.useLostConnectionListener
// suspense.useMarkAllInboxNotificationsAsRead
// suspense.useMarkInboxNotificationAsRead
// suspense.useDeleteAllInboxNotifications
// suspense.useDeleteInboxNotification
// suspense.useMarkThreadAsRead
// suspense.useMutation
// suspense.useMyPresence
// suspense.useOther
// suspense.useOthers
// suspense.useOthersConnectionIds
// suspense.useOthersListener
// suspense.useOthersMapped
// suspense.useRedo
// suspense.useRemoveReaction
// suspense.useRoom
// suspense.useRoomInfo
// suspense.useRoomNotificationSettings
// suspense.useSelf
// suspense.useStatus
// suspense.useStorage
// suspense.useStorageRoot
// suspense.useThreads
// suspense.UseThreadsOptions
// suspense.useThreadSubscription
// suspense.useUndo
// suspense.useUnreadInboxNotificationsCount
// suspense.useUpdateMyPresence
// suspense.useUpdateRoomNotificationSettings
// suspense.useUser
