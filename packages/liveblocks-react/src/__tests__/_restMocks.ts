import type {
  BaseMetadata,
  CommentData,
  GroupData,
  InboxNotificationData,
  NotificationSettingsPlain,
  PartialNotificationSettings,
  Permission,
  RoomSubscriptionSettings,
  SubscriptionData,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import type { ResponseResolver, RestContext, RestRequest } from "msw";
import { rest } from "msw";

export function mockGetThreads(
  resolver: ResponseResolver<
    RestRequest<never, { roomId: string }>,
    RestContext,
    {
      data: ThreadData<any>[];
      inboxNotifications: InboxNotificationData[];
      subscriptions: SubscriptionData[];
      meta: {
        nextCursor: string | null;
        requestedAt: string;
        permissionHints: Record<string, Permission[]>;
      };
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/threads",
    resolver
  );
}

export function mockGetThread(
  params: { threadId: string },
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    {
      thread: ThreadData<any>;
      inboxNotification?: InboxNotificationData;
      subscription?: SubscriptionData;
    }
  >
) {
  return rest.get(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/thread-with-notification/${params.threadId}`,
    resolver
  );
}

export function mockCreateThread(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    ThreadData<any>
  >
) {
  return rest.post(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/threads",
    resolver
  );
}

export function mockDeleteThread(
  params: { threadId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, any>
) {
  return rest.delete(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}`,
    resolver
  );
}

export function mockCreateComment(
  params: { threadId: string },
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    CommentData
  >
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/comments`,
    resolver
  );
}

export function mockDeleteComment(
  params: { threadId: string; commentId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, any>
) {
  return rest.delete(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/comments/${params.commentId}`,
    resolver
  );
}

export function mockEditThreadMetadata<M extends BaseMetadata>(
  params: { threadId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, M>
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/metadata`,
    resolver
  );
}

export function mockMarkThreadAsResolved(
  params: { threadId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext>
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/mark-as-resolved`,
    resolver
  );
}

export function mockMarkThreadAsUnresolved(
  params: { threadId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext>
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/mark-as-unresolved`,
    resolver
  );
}

export function mockSubscribeToThread(
  params: { threadId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext>
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/subscribe`,
    resolver
  );
}

export function mockUnsubscribeFromThread(
  params: { threadId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext>
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/unsubscribe`,
    resolver
  );
}

export function mockMarkInboxNotificationsAsRead(
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, any>
) {
  return rest.post(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/inbox-notifications/read",
    resolver
  );
}

export function mockMarkAllInboxNotificationsAsRead(
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, any>
) {
  return rest.post(
    "https://api.liveblocks.io/v2/c/inbox-notifications/read",
    resolver
  );
}

export function mockGetInboxNotifications(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    {
      threads: ThreadData[];
      inboxNotifications: InboxNotificationData[];
      subscriptions: SubscriptionData[];
      groups: GroupData[];
      meta: {
        requestedAt: string; // ISO date
        nextCursor: string | null;
      };
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/inbox-notifications",
    resolver
  );
}

export function mockGetInboxNotificationsDelta(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    {
      threads: ThreadData[];
      inboxNotifications: InboxNotificationData[];
      subscriptions: SubscriptionData[];
      deletedInboxNotifications: InboxNotificationData[];
      deletedThreads: ThreadDataWithDeleteInfo[];
      deletedSubscriptions: SubscriptionData[];
      meta: {
        requestedAt: string; // ISO date
      };
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
    resolver
  );
}

export function mockDeleteAllInboxNotifications(
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, any>
) {
  return rest.delete(
    "https://api.liveblocks.io/v2/c/inbox-notifications",
    resolver
  );
}

export function mockDeleteInboxNotification(
  params: { inboxNotificationId: string },
  resolver: ResponseResolver<RestRequest<never, never>, RestContext, any>
) {
  return rest.delete(
    `https://api.liveblocks.io/v2/c/inbox-notifications/${params.inboxNotificationId}`,
    resolver
  );
}

export function mockGetRoomSubscriptionSettings(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    RoomSubscriptionSettings
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/subscription-settings",
    resolver
  );
}

export function mockUpdateRoomSubscriptionSettings(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    RoomSubscriptionSettings
  >
) {
  return rest.post(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/subscription-settings",
    resolver
  );
}

export function mockGetNotificationSettings(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    NotificationSettingsPlain
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/notification-settings",
    resolver
  );
}

export function mockUpdateNotificationSettings(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    PartialNotificationSettings
  >
) {
  return rest.post(
    "https://api.liveblocks.io/v2/c/notification-settings",
    resolver
  );
}

export function mockFindGroups(
  resolver: ResponseResolver<
    RestRequest<{ groupIds: string[] }, never>,
    RestContext,
    { groups: GroupData[] }
  >
) {
  return rest.post("https://api.liveblocks.io/v2/c/groups/find", resolver);
}
