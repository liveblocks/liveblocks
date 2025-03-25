/* eslint-disable */
// @ts-nocheck
import {
  createClient,
  type RoomSubscriptionSettings,
} from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const room = client.enterRoom("my-room");

function updateSettings(settings: RoomSubscriptionSettings) {
  return room.updateSubscriptionSettings(settings);
}

const settings = room.getSubscriptionSettings();
