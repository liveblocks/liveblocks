<script lang="ts" setup>
import { client } from "@/liveblocks.config";
import { onUnmounted } from "vue";
import LiveCursors from "@/components/LiveCursors.vue";

const initialPresence = {
  cursor: null,
};

let roomId = "vuejs-live-cursors";

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
  <LiveCursors :room="room" />
</template>
