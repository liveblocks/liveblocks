/* eslint-disable */
// @ts-nocheck
import {
  createClient,
  type RoomSubscriptionSettings,
} from "@liveblocks/client";
import type { NotificationSettings } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

const room = client.enterRoom("my-room");
const myRoom = room;

function updateSettings(settings: RoomSubscriptionSettings) {
  return room.updateSubscriptionSettings(settings);
}

function updateEmailsNotifications(settings: NotificationSettings) {
  return client.updateNotificationSettings(settings);
}

const settings = myRoom.getSubscriptionSettings();
