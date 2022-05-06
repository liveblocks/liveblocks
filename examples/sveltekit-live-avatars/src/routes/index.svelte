<script lang="ts">
  import LiveblocksProvider from "../lib/LiveblocksProvider.svelte";
  import RoomProvider from "../lib/RoomProvider.svelte";
  import { createClient, type Client } from "@liveblocks/client";
  import { onMount } from "svelte";
  import App from "../components/App.svelte";

  let client: Client;

  // Set up the client on load
  // Check inside src/routes/api/auth.ts for the serverless function
  onMount(() => {
    client = createClient({
      authEndpoint: "/api/auth"
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
    <RoomProvider id="sveltekit-live-avatars">
      <App />
    </RoomProvider>
  </LiveblocksProvider>
{/if}
