<script lang="ts">
  import LiveblocksProvider from "../lib/LiveblocksProvider.svelte";
  import RoomProvider from "../lib/RoomProvider.svelte";
  import { createClient, type Client } from "@liveblocks/client";
  import { onMount } from "svelte";
  import App from "../components/App.svelte";

  let client: Client;

  let roomId = "sveltekit-live-avatars";

  // Set up the client on load
  // Check inside src/routes/api/auth.ts for the serverless function
  onMount(() => {
    overrideRoomId();

    client = createClient({
      authEndpoint: "/api/auth",
    });
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

<!--
  These custom providers work similarly to the `liveblocks-react` library
  https://liveblocks.io/docs/api-reference/liveblocks-react
  More info inside src/lib-liveblocks
-->
{#if client}
  <LiveblocksProvider {client}>
    <RoomProvider id={roomId}>
      <App />
    </RoomProvider>
  </LiveblocksProvider>
{/if}
