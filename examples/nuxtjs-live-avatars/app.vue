<template>
  <main class="main">
    <div class="avatars">
      <Avatar
        v-for="user in others.slice(0, 3)"
        v-bind:key="user.connectionId"
        v-bind:src="user.avatar"
        v-bind:name="user.name"
      />

      <div v-if="others.length > 3" class="more">+{{ others.length - 3 }}</div>

      <div class="self">
        <Avatar
          v-if="currentUser"
          v-bind:src="currentUser.info.avatar"
          name="You"
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

<script>
import { createClient } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/liveblocks-auth",
});

// Presence not used in this example
const initialPresence = {};

let roomId = "nuxtjs-live-avatars";

export default {
  data() {
    return {
      others: [],
      currentUser: null,
    };
  },
  mounted() {
    overrideRoomId();

    const room = client.enter(roomId, { initialPresence });
    this._unsubscribeOthers = room.subscribe("others", this.onOthersChange);
    this._unsubscribeConnection = room.subscribe(
      "connection",
      this.onConnectionChange
    );
    this._room = room;
  },
  destroyed() {
    this._unsubscribeOthers();
    this._unsubscribeConnection();
    client.leave(roomId);
  },
  methods: {
    onOthersChange(others) {
      // The avatar and name are coming from the authentication endpoint
      // See api.js for and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
      this.others = others.map((user) => ({
        connectionId: user.connectionId,
        avatar: user.info?.avatar,
        name: user.info?.name,
      }));
    },
    onConnectionChange() {
      this.currentUser = this._room.getSelf();
    },
  },
};

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
