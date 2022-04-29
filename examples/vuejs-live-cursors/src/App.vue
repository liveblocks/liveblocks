<template>
  <div
    v-on:pointerleave="pointerLeave"
    v-on:pointermove="pointerMove"
    class="container"
  >
    <div class="text">
      {{
        cursor
          ? `${cursor.x} × ${cursor.y}`
          : "Move your cursor to broadcast its position to other people in the room."
      }}
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

/**
 * Replace by your public key from https://liveblocks.io/dashboard/apikeys.
 */
const PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";

if (!/^pk_(live|test)/.test(PUBLIC_KEY)) {
  console.warn(
    `Replace "${PUBLIC_KEY}" by your public key from https://liveblocks.io/dashboard/apikeys.\n` +
      `Learn more: https://github.com/liveblocks/liveblocks/tree/main/examples/vuejs-live-cursors#getting-started.`
  );
}

const client = createClient({
  publicApiKey: PUBLIC_KEY,
});

const COLORS = ["#DC2626", "#D97706", "#059669", "#7C3AED", "#DB2777"];

const defaultRoomId = "vuejs-live-cursors";

export default Vue.extend({
  data: function () {
    return {
      cursor: null,
      cursors: [],
    };
  },
  mounted: function () {
    const roomSuffix = new URLSearchParams(window?.location?.search).get(
      "room"
    );
    let roomId = defaultRoomId;

    /**
     * Add a suffix to the room ID using a query parameter.
     * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
     *
     * http://localhost:3000/?room=1234 → vuejs-live-cursors-1234
     */
    if (roomSuffix) {
      roomId = `${defaultRoomId}-${roomSuffix}`;
    }

    const room = client.enter(roomId, { cursor: null });
    this._room = room;
    this._unsubscribe = room.subscribe("my-presence", this.onPresenceChange);
    this._unsubscribeOthers = room.subscribe("others", this.onOthersChange);
  },
  destroyed: function () {
    this._unsubscribe();
    this._unsubscribeOthers();
    client.leave(roomId);
  },
  methods: {
    pointerMove: function (e) {
      this._room.updatePresence({
        cursor: {
          x: Math.round(e.clientX),
          y: Math.round(e.clientY),
        },
      });
    },
    pointerLeave: function () {
      this._room.updatePresence({
        cursor: null,
      });
    },
    onPresenceChange: function (presence) {
      this.cursor = presence?.cursor ?? null;
    },
    onOthersChange: function (others) {
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
