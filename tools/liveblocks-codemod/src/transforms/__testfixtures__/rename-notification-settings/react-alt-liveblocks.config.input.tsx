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

const { useRoomNotificationSettings, useUpdateRoomNotificationSettings } =
  createRoomContext(client);

export { useRoomNotificationSettings, useUpdateRoomNotificationSettings };

export const { LiveblocksProvider } = createLiveblocksContext(client);
