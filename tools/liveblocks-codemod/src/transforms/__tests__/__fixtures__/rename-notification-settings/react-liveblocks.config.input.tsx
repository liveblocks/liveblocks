/* eslint-disable */
// @ts-nocheck
import { createClient } from "@liveblocks/client";
import { createRoomContext, createLiveblocksContext } from "@liveblocks/react";
import {
  useRoomNotificationSettings,
  useUpdateRoomNotificationSettings,
} from "./liveblocks.config";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

export const {
  RoomProvider,
  useRoomNotificationSettings,
  suspense: { useUpdateRoomNotificationSettings },
} = createRoomContext(client);

export const { LiveblocksProvider } = createLiveblocksContext(client);
