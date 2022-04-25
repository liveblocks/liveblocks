<template>
  <div
    v-on:pointerleave="pointerLeave"
    v-on:pointermove="pointerMove"
    class="container"
  >
    <div class="text">
      Move your cursor to broadcast its position to other people in the room
    </div>
    <svg
      v-for="cursor in cursors"
      v-bind:key="cursor.connectionId"
      v-bind:style="{
        transform: `translateX(${cursor.x}px) translateY(${cursor.y}px)`,
      }"
      class="cursor"
      width="24"
      height="36"
      viewBox="0 0 24 36"
      v-bind:fill="cursor.color"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
      />
    </svg>
  </div>
</template>

<script>
import Vue from "vue";
import { createClient } from "@liveblocks/client";

const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  throw new Error(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/vuejs-live-cursors#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

const roomId = "vuejs-live-cursors";

export default Vue.extend({
  data: function() {
    return {
      cursors: [],
    };
  },
  mounted: function() {
    const room = client.enter(roomId, { cursor: null });
    this._room = room;
    this._unsubscribe = room.subscribe("others", this.onOthersChange);
  },
  destroyed: function() {
    this._unsubscribe();
    client.leave(roomId);
  },
  methods: {
    pointerMove: function(e) {
      this._room.updatePresence({
        cursor: {
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
        },
      });
    },
    pointerLeave: function() {
      this._room.updatePresence({
        cursor: null,
      });
    },
    onOthersChange: function(others) {
      this.cursors = others
        .toArray()
        .filter((user) => user.presence?.cursor)
        .map((user) => ({
          x: user.presence.cursor.x,
          y: user.presence.cursor.y,
          color: COLORS[user.connectionId % COLORS.length],
          connectionId: user.connectionId,
        }));
    },
  },
});
</script>
