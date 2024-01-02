import type { CommentDataPlain, ThreadDataPlain } from "@liveblocks/core";
import type {
  ResponseResolver,
  type RestContext,
  type RestRequest,
} from "msw";
import {
  rest} from "msw";

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
