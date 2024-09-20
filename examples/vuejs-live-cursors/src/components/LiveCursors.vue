<script lang="ts" setup>
import { onUnmounted, ref } from "vue";
import Cursor from "@/components/Cursor.vue";
import type { Room } from "@liveblocks/client";

const { room } = defineProps<{
  room: Room;
}>();

// Get initial values for presence and others
const myPresence = ref(room.getPresence());
const others = ref(room.getOthers());

// Subscribe to further changes
const unsubscribeMyPresence = room.subscribe("my-presence", (newPresence) => {
  myPresence.value = newPresence;
});

const unsubscribeOthers = room.subscribe("others", (newOthers) => {
  // @ts-ignore
  others.value = newOthers;
});

// Unsubscribe when unmounting
onUnmounted(() => {
  unsubscribeMyPresence();
  unsubscribeOthers();
});

// Update cursor presence to current pointer location
function handlePointerMove(event: PointerEvent) {
  room.updatePresence({
    cursor: {
      x: Math.round(event.clientX),
      y: Math.round(event.clientY),
    },
  });
}

// When the pointer leaves the page, set cursor presence to null
function handlePointerLeave() {
  room.updatePresence({
    cursor: null,
  });
}

const COLORS = [
  "#E57373",
  "#9575CD",
  "#4FC3F7",
  "#81C784",
  "#FFF176",
  "#FF8A65",
  "#F06292",
  "#7986CB",
];
</script>

<template>
  <main @pointerleave="handlePointerLeave" @pointermove="handlePointerMove">
    <!-- Show the current user's cursor location -->
    <div class="text">
      {{
        myPresence?.cursor
          ? `${myPresence.cursor.x} × ${myPresence.cursor.y}`
          : "Move your cursor to broadcast its position to other people in the room."
      }}
    </div>

    <!-- Iterate through others and show their cursors -->
    <template v-for="{ connectionId, presence } in others">
      <Cursor
        v-if="presence.cursor"
        :color="COLORS[connectionId % COLORS.length]"
        :x="presence.cursor.x"
        :y="presence.cursor.y"
      />
    </template>
  </main>
</template>

<style scoped>
main {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  place-content: center;
  place-items: center;
  touch-action: none;
}

.text {
  max-width: 380px;
  margin: 0 16px;
  text-align: center;
}
</style>
