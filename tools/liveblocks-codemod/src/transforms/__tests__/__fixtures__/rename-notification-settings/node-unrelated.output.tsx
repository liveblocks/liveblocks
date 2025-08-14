/* eslint-disable */
// @ts-nocheck
import { Client } from "my-lib";

const client = new Client();

const notificationSettings = await client.getRoomNotificationSettings();

const updatedNotificationSettings = await client.updateRoomNotificationSettings(
  {
    enabled: true,
  }
);

await client.deleteRoomNotificationSettings();
