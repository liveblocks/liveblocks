<template>
  <main class="flex justify-center items-center h-screen select-none">
    <GithubLink
      className="fixed top-8 right-8"
      href="https://github.com/liveblocks/liveblocks/tree/main/examples/nuxtjs-live-avatars"
    ></GithubLink>
    <div class="flex flex-row pl-3">
      <Avatar
        v-for="user in others"
        v-bind:key="user.connectionId"
        v-bind:picture="user.picture"
        v-bind:name="user.name"
      ></Avatar>

      <div class="relative ml-8">
        <Avatar
          v-if="currentUser"
          v-bind:picture="currentUser.info.picture"
          name="You"
        ></Avatar>
      </div>
    </div>
  </main>
</template>

<script>
import Vue from "vue";
import { createClient } from "@liveblocks/client";

const client = createClient({
  authEndpoint: "/api/auth"
});

const roomId = "nuxt-js-live-avatars";

export default Vue.extend({
  data: function() {
    return {
      others: [],
      currentUser: null
    };
  },
  mounted: function() {
    const room = client.enter(roomId);
    room.subscribe("others", this.onOthersChange);
    room.subscribe("connection", this.onConnectionChange);
    this._room = room;
  },
  destroyed: function() {
    this._room.unsubscribe("others", this.onOthersChange);
    this._room.unsubscribe("connection", this.onConnectionChange);
    client.leave(roomId);
  },
  methods: {
    onOthersChange: function(others) {
      // The picture and name are comming from the authentication endpoint
      // See api.js for and https://liveblocks.io/docs/api-reference/liveblocks-node#authorize for more information
      this.others = others.map(user => ({
        connectionId: user.connectionId,
        picture: user.info?.picture,
        name: user.info?.name
      }));
    },
    onConnectionChange: function() {
      this.currentUser = this._room.getSelf();
    }
  }
});
</script>
