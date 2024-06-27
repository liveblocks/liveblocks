/* eslint-disable */
// @ts-nocheck
import { createClient } from "@liveblocks/client";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext(client);

export { RoomProvider, useThreads };

export const {
  LiveblocksProvider,
  useRoomInfo,
  useUser,
  useInboxNotificationThread,
  useMarkInboxNotificationAsRead,
  suspense: { useInboxNotifications },
} = createLiveblocksContext(client);
