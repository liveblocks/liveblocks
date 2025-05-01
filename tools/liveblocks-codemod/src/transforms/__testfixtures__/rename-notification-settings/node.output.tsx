/* eslint-disable */
// @ts-nocheck
import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: "sk_prod_xxxxxxxxxxxxxxxxxxxxxxxx",
});

const notificationSettings = await liveblocks.getRoomSubscriptionSettings({
  roomId: "my-room-id",
  userId: "steven@example.com",
});

const updatedNotificationSettings =
  await liveblocks.updateRoomSubscriptionSettings({
    roomId: "my-room-id",
    userId: "steven@example.com",
    data: {
      threads: "replies_and_mentions",
    },
  });

await liveblocks.deleteRoomSubscriptionSettings({
  roomId: "my-room-id",
  userId: "steven@example.com",
});
