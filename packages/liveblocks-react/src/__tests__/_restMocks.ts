import type {
  CommentDataPlain,
  PartialInboxNotificationDataPlain,
  ThreadDataPlain,
} from "@liveblocks/core";
import type { ResponseResolver, RestContext, RestRequest } from "msw";
import { rest } from "msw";

export function mockGetThreads(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    {
      data: ThreadDataPlain<any>[];
      inboxNotifications: any[];
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
    ThreadDataPlain<any> & {
      inboxNotification?: PartialInboxNotificationDataPlain;
    }
  >
) {
  return rest.get(
    `https://api.liveblocks.io/v2/c/rooms/room-id/threads/${params.threadId}`,
    resolver
  );
}

export function mockCreateThread(
  resolver: ResponseResolver<
    RestRequest<never, never>,
    RestContext,
    ThreadDataPlain<any>
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
    CommentDataPlain
  >
) {
  return rest.post(
    `https://api.liveblocks.io/v2/c/rooms/room-id/threads/${params.threadId}/comments`,
    resolver
  );
}
