/* eslint-disable */
// @ts-nocheck
import {
  createClient,
  type RoomNotificationSettings,
} from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const room = client.enterRoom("my-room");

function updateSettings(settings: RoomNotificationSettings) {
  return room.updateNotificationSettings(settings);
}

const settings = room.getNotificationSettings();
