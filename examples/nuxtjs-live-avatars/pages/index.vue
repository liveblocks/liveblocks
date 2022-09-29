<template>
  <main class="flex justify-center items-center h-screen select-none">
    <div class="flex flex-row pl-3">
      <Avatar
        v-for="user in others.slice(0, 3)"
        v-bind:key="user.connectionId"
        v-bind:picture="user.picture"
        v-bind:name="user.name"
      />

      <div v-if="others.length > 3" class="more">+{{ others.length - 3 }}</div>

      <div class="relative ml-8 first:ml-0">
        <Avatar
          v-if="currentUser"
          v-bind:picture="currentUser.info.picture"
          name="You"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
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

<script>
import Vue from "vue";
import { createClient } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/auth",
});

// Presence not used in this example
const initialPresence = {};

let roomId = "nuxtjs-live-avatars";

export default Vue.extend({
  data: function () {
    return {
      others: [],
      currentUser: null,
    };
  },
  mounted: function () {
    overrideRoomId();

    const room = client.enter(roomId, { initialPresence });
    this._unsubscribeOthers = room.subscribe("others", this.onOthersChange);
    this._unsubscribeConnection = room.subscribe(
      "connection",
      this.onConnectionChange
    );
    this._room = room;
  },
  destroyed: function () {
    this._unsubscribeOthers();
    this._unsubscribeConnection();
    client.leave(roomId);
  },
  methods: {
    onOthersChange: function (others) {
      // The picture and name are comming from the authentication endpoint
      // See api.js for and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
      this.others = others.map((user) => ({
        connectionId: user.connectionId,
        picture: user.info?.picture,
        name: user.info?.name,
      }));
    },
    onConnectionChange: function () {
      this.currentUser = this._room.getSelf();
    },
  },
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
