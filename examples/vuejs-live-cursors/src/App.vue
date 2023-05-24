<script lang="ts" setup>
import { client, Room } from "../liveblocks.config";
import { onUnmounted } from "vue";
import LiveCursors from "@/components/LiveCursors.vue";

const initialPresence = {
  cursor: null,
};

// Join a room
const roomId = "vuejs-live-cursors";
const room: Room = client.enter(roomId, { initialPresence });

// Leave room onUnmount
onUnmounted(() => {
  client.leave(roomId);
});

</script>

<template>
  <LiveCursors :room="room" />
</template>

