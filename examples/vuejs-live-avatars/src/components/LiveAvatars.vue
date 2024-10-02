<script lang="ts" setup>
import { onUnmounted, ref } from "vue";
import Avatar from "@/components/Avatar.vue";
import type { Room } from "@liveblocks/client";

const { room } = defineProps<{
  room: Room;
}>();

// Get initial values for presence and others
const currentUser = ref(room.getPresence());
const others = ref(room.getOthers());

// Subscribe to further changes
const unsubscribeMyPresence = room.subscribe("my-presence", (newPresence) => {
  currentUser.value = newPresence;
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
</script>

<template>
  <main class="main">
    <div class="avatars">
      <Avatar
        v-for="{ presence, connectionId } in others.slice(0, 3)"
        v-bind:key="connectionId"
        v-bind:name="presence.name"
        v-bind:avatar="presence.avatar"
      />

      <div v-if="others.length > 3" class="more">+{{ others.length - 3 }}</div>

      <div class="self">
        <Avatar
          v-if="currentUser"
          name="You"
          v-bind:avatar="currentUser.avatar"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
.main {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  overflow: hidden;
}

.avatars {
  display: flex;
  padding-left: 12px;
}

.self {
  position: relative;
  margin-left: 32px;
}

.self:first-child {
  margin-left: 0;
}

.more {
  border-width: 4px;
  border-radius: 9999px;
  border-color: white;
  background-color: #9ca3af;
  min-width: 56px;
  width: 56px;
  height: 56px;
  margin-left: -0.75rem;
  display: flex;
  z-index: 1;
  justify-content: center;
  align-items: center;
  color: white;
}
</style>
