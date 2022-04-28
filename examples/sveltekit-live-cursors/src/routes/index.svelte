<script lang="ts">
  import LiveblocksProvider from "../lib/LiveblocksProvider.svelte";
  import RoomProvider from "../lib/RoomProvider.svelte";
  import { createClient, type Client } from "@liveblocks/client";
  import { onMount } from "svelte";
  import App from "../components/App.svelte";

  const defaultRoomId = "sveltekit-live-cursors";

  let client: Client;
  let roomId = defaultRoomId;

  // Set up the client on load
  // Check inside src/routes/api/auth.ts for the serverless function
  onMount(() => {
    const roomSuffix = new URLSearchParams(window?.location?.search).get(
      "room"
    );

    /**
     * Add a suffix to the room ID using a query parameter.
     * Used for coordinating rooms from outside (e.g. https://liveblocks.io/examples).
     *
     * http://localhost:3000/?room=1234 → sveltekit-live-cursors-1234
     */
    if (roomSuffix) {
      roomId = `${defaultRoomId}-${roomSuffix}`;
    }

    client = createClient({
      authEndpoint: "/api/auth",
    });
  });
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
