/* eslint-disable */
// @ts-nocheck
import { room, type RoomNotificationSettings } from "my-lib";

function updateSettings(settings: RoomNotificationSettings) {
  return room.updateNotificationSettings(settings);
}

const settings = room.getNotificationSettings();
