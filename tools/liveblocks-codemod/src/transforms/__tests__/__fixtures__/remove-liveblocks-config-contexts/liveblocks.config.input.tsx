/* eslint-disable */
// @ts-nocheck
import { Json, LiveObject, createClient } from "@liveblocks/client";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";

export const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
  throttle: 16,
});

type Presence = {
  selectedShape: string | null;
};

type ThreadMetadata = {
  x: number;
  y: number;
};

const {
  suspense: { RoomProvider, useThreads },
} = createRoomContext<
  Presence,
  never,
  UserMeta,
  { type: "message"; message: string },
  ThreadMetadata
>(client);

export const {
  LiveblocksProvider,
  useRoomInfo,
  useUser,
  useInboxNotificationThread,
  useMarkInboxNotificationAsRead,
  suspense: { useInboxNotifications },
} = createLiveblocksContext<never, ThreadMetadata>(client);

export { RoomProvider, useThreads };

type Shape = LiveObject<{
  x: number;
  y: number;
  fill: string;
}>;

export { Shape, Presence };

type UserMeta = {
  id?: string; // Accessible through `user.id`
  info?: Json; // Accessible through `user.info`
};
