/* eslint-disable */
// @ts-nocheck
import {
  createClient,
  type RoomNotificationSettings,
} from "@liveblocks/client";
import type { UserNotificationSettings } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const room = client.enterRoom("my-room");
const myRoom = room;

function updateSettings(settings: RoomNotificationSettings) {
  return room.updateNotificationSettings(settings);
}

function updateEmailsNotifications(settings: UserNotificationSettings) {
  return client.updateNotificationSettings(settings);
}

const settings = myRoom.getNotificationSettings();
