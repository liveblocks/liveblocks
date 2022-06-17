<script lang="ts">
  import { type Client, createClient, type Room } from "@liveblocks/client";
  import { onDestroy, onMount } from "svelte";
  import App from "../components/App.svelte";

  let client: Client;
  let room: Room;
  let roomId = "sveltekit-live-cursors";

  // Define your presence and storage types for `client.enter`
  type Presence = {
    cursor: { x: number; y: number } | null;
  };
  type Storage = {};

  // Set up the client on load
  // Check inside src/routes/api/auth.ts for the serverless function
  onMount(() => {
    overrideRoomId();

    client = createClient({
      authEndpoint: "/api/auth",
    });

    room = client.enter<Presence, Storage>(roomId);
  });

  onDestroy(() => {
    if (client && room) {
      client.leave(roomId);
    }
  });

  /**
   * This function is used when deploying an example on liveblocks.io.
   * You can ignore it completely if you run the example locally.
   */
  function overrideRoomId () {
    const query = new URLSearchParams(window?.location?.search);
    const roomIdSuffix = query.get("roomId");

    if (roomIdSuffix) {
      roomId = `${roomId}-${roomIdSuffix}`;
    }
  }
</script>

{#if room}
  <App room={room} />
{/if}
