<script lang="ts" setup>
import { client } from "@/liveblocks.config";
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

applyExampleRoomId();

// Join a room
const { room, leave } = client.enterRoom(roomId, { initialPresence });

// Leave room onUnmount
onUnmounted(() => {
  leave();
});

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function applyExampleRoomId() {
  if (typeof window === "undefined") {
    return;
  }

  const query = new URLSearchParams(window?.location?.search);
  const exampleId = query.get("exampleId");

  if (exampleId) {
    roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
  }
}
</script>

<template>
  <LiveAvatars :room="room" />
</template>
