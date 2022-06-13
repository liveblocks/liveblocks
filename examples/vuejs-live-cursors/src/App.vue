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

let PUBLIC_KEY = "pk_YOUR_PUBLIC_KEY";
let roomId = "vuejs-live-cursors";

overrideApiKeyAndRoomId();

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

export default Vue.extend({
  data: function () {
    return {
      cursor: null,
      cursors: [],
    };
  },
  mounted: function () {
    const room = client.enter(roomId, { initialPresence: { cursor: null } });
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

/**
 * This function is used when deploying an example on liveblocks.io.
 * You can ignore it completely if you run the example locally.
 */
function overrideApiKeyAndRoomId() {
  const query = new URLSearchParams(window?.location?.search);
  const apiKey = query.get("apiKey");
  const roomIdSuffix = query.get("roomId");

  if (apiKey) {
    PUBLIC_KEY = apiKey;
  }

  if (roomIdSuffix) {
    roomId = `${roomId}-${roomIdSuffix}`;
  }
}
</script>
