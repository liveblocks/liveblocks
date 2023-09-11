<script lang="ts" setup>
import { client, type TypedRoom } from "@/liveblocks.config";
import { onUnmounted } from "vue";
import LiveAvatars from "@/components/LiveAvatars.vue";

const NAMES = [
  "Charlie Layne",
  "Mislav Abha",
  "Tatum Paolo",
  "Anjali Wanda",
  "Jody Hekla",
  "Emil Joyce",
  "Jory Quispe",
  "Quinn Elton",
];

const initialPresence = {
  name: NAMES[Math.floor(Math.random() * NAMES.length)],
  avatar: `https://liveblocks.io/avatars/avatar-${Math.floor(
    Math.random() * 30
  )}.png`,
};

let roomId = "vuejs-live-avatars";
overrideRoomId();

// Join a room
const room: TypedRoom = client.enter(roomId, { initialPresence });

// Leave room onUnmount
onUnmounted(() => {
  client.leave(roomId);
});

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const roomIdSuffix = query.get("roomId");

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
</script>

<template>
  <LiveAvatars :room="room" />
</template>
