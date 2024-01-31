import type {
  CommentData,
  InboxNotificationData,
  ThreadData,
} from "@liveblocks/core";
import type { ResponseResolver, RestContext, RestRequest } from "msw";
import { rest } from "msw";

export function mockGetThreads(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    {
      data: ThreadData<any>[];
      inboxNotifications: InboxNotificationData[];
    }
  >
) {
  return rest.post(
    "https://api.liveblocks.io/v2/c/rooms/room-id/threads/search",
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
    }
  >
) {
  return rest.get(
    `https://api.liveblocks.io/v2/c/rooms/room-id/thread-with-notification/${params.threadId}`,
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
    "https://api.liveblocks.io/v2/c/rooms/room-id/threads",
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
    `https://api.liveblocks.io/v2/c/rooms/room-id/threads/${params.threadId}/comments`,
    resolver
  );
}

export function mockMarkInboxNotificationsAsRead(
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
      threads: ThreadData<any>[];
      inboxNotifications: InboxNotificationData[];
    }
  >
) {
  return rest.get(
    "https://api.liveblocks.io/v2/c/inbox-notifications",
    resolver
  );
}
