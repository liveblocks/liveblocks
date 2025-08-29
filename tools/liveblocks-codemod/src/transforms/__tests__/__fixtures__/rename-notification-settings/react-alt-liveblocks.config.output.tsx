/* eslint-disable */
// @ts-nocheck
import { createClient } from "@liveblocks/client";
import { createRoomContext, createLiveblocksContext } from "@liveblocks/react";
import {
  useRoomSubscriptionSettings,
  useUpdateRoomSubscriptionSettings,
} from "./liveblocks.config";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const { useRoomSubscriptionSettings, useUpdateRoomSubscriptionSettings } =
  createRoomContext(client);

export { useRoomSubscriptionSettings, useUpdateRoomSubscriptionSettings };

export const { LiveblocksProvider } = createLiveblocksContext(client);
