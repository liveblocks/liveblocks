<!--
  Works similarly to `liveblocks-react` LiveblocksProvider
  https://liveblocks.io/docs/api-reference/liveblocks-react#RoomProvider
-->
<script lang="ts">
  import { clientSymbol } from "./symbols";
  import type { Client } from "@liveblocks/client";
  import { setContext } from "svelte";

  export let client: Client;

  if (!client) {
    throw new Error("LiveblocksProvider requires a client");
  }

  setContext<Client>(clientSymbol, client);
</script>

<slot />
