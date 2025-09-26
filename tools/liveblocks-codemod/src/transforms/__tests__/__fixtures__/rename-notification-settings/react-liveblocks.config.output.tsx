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

export const {
  RoomProvider,
  useRoomSubscriptionSettings,
  suspense: { useUpdateRoomSubscriptionSettings },
} = createRoomContext(client);

export const { LiveblocksProvider } = createLiveblocksContext(client);
