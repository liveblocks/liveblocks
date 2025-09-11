import type {
  BaseMetadata,
  CommentBody,
  CommentData,
  InboxNotificationData,
  NotificationSettingsPlain,
  PartialNotificationSettings,
  Permission,
  RoomSubscriptionSettings,
  SubscriptionData,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import type { HttpResponseResolver } from "msw";
import { http } from "msw";

export function mockGetThreads(
  resolver: HttpResponseResolver<
    { roomId: string },
    never,
    {
      data: ThreadData[];
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
  return http.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/threads",
    resolver
  );
}

export function mockGetThread(
  params: { threadId: string },
  resolver: HttpResponseResolver<
    { roomId: string },
    never,
    {
      thread: ThreadData;
      inboxNotification?: InboxNotificationData;
      subscription?: SubscriptionData;
    }
  >
) {
  return http.get(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/thread-with-notification/${params.threadId}`,
    resolver
  );
}

export function mockCreateThread(
  resolver: HttpResponseResolver<
    { roomId: string },
    { id: string; comment: { id: string; body: CommentBody } },
    ThreadData
  >
) {
  return http.post(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/threads",
    resolver
  );
}

export function mockDeleteThread(
  params: { threadId: string },
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.delete(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}`,
    resolver
  );
}

export function mockCreateComment(
  params: { threadId: string },
  resolver: HttpResponseResolver<
    { roomId: string },
    { id: string; body: CommentBody },
    CommentData
  >
) {
  return http.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/comments`,
    resolver
  );
}

export function mockDeleteComment(
  params: { threadId: string; commentId: string },
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.delete(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/comments/${params.commentId}`,
    resolver
  );
}

export function mockEditThreadMetadata<M extends BaseMetadata>(
  params: { threadId: string },
  resolver: HttpResponseResolver<{ roomId: string }, M, M>
) {
  return http.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/metadata`,
    resolver
  );
}

export function mockMarkThreadAsResolved(
  params: { threadId: string },
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/mark-as-resolved`,
    resolver
  );
}

export function mockMarkThreadAsUnresolved(
  params: { threadId: string },
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/mark-as-unresolved`,
    resolver
  );
}

export function mockSubscribeToThread(
  params: { threadId: string },
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/subscribe`,
    resolver
  );
}

export function mockUnsubscribeFromThread(
  params: { threadId: string },
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.post(
    `https://api.liveblocks.io/v2/c/rooms/:roomId/threads/${params.threadId}/unsubscribe`,
    resolver
  );
}

export function mockMarkInboxNotificationsAsRead(
  resolver: HttpResponseResolver<{ roomId: string }>
) {
  return http.post(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/inbox-notifications/read",
    resolver
  );
}

export function mockMarkAllInboxNotificationsAsRead(
  resolver: HttpResponseResolver
) {
  return http.post(
    "https://api.liveblocks.io/v2/c/inbox-notifications/read",
    resolver
  );
}

export function mockGetInboxNotifications(
  resolver: HttpResponseResolver<
    never,
    never,
    {
      threads: ThreadData[];
      inboxNotifications: InboxNotificationData[];
      subscriptions: SubscriptionData[];
      meta: {
        requestedAt: string; // ISO date
        nextCursor: string | null;
      };
    }
  >
) {
  return http.get(
    "https://api.liveblocks.io/v2/c/inbox-notifications",
    resolver
  );
}

export function mockGetInboxNotificationsDelta(
  resolver: HttpResponseResolver<
    never,
    never,
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
  return http.get(
    "https://api.liveblocks.io/v2/c/inbox-notifications/delta",
    resolver
  );
}

export function mockDeleteAllInboxNotifications(
  resolver: HttpResponseResolver
) {
  return http.delete(
    "https://api.liveblocks.io/v2/c/inbox-notifications",
    resolver
  );
}

export function mockDeleteInboxNotification(
  params: { inboxNotificationId: string },
  resolver: HttpResponseResolver
) {
  return http.delete(
    `https://api.liveblocks.io/v2/c/inbox-notifications/${params.inboxNotificationId}`,
    resolver
  );
}

export function mockGetRoomSubscriptionSettings(
  resolver: HttpResponseResolver<
    { roomId: string },
    never,
    RoomSubscriptionSettings
  >
) {
  return http.get(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/subscription-settings",
    resolver
  );
}

export function mockUpdateRoomSubscriptionSettings(
  resolver: HttpResponseResolver<
    { roomId: string },
    never,
    RoomSubscriptionSettings
  >
) {
  return http.post(
    "https://api.liveblocks.io/v2/c/rooms/:roomId/subscription-settings",
    resolver
  );
}

export function mockGetNotificationSettings(
  resolver: HttpResponseResolver<never, never, NotificationSettingsPlain>
) {
  return http.get(
    "https://api.liveblocks.io/v2/c/notification-settings",
    resolver
  );
}

export function mockUpdateNotificationSettings(
  resolver: HttpResponseResolver<never, never, PartialNotificationSettings>
) {
  return http.post(
    "https://api.liveblocks.io/v2/c/notification-settings",
    resolver
  );
}
