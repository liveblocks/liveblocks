<script lang="ts">
import LiveblocksProvider from '../lib-liveblocks/LiveblocksProvider.svelte'
import RoomProvider from '../lib-liveblocks/RoomProvider.svelte'
import { createClient } from '@liveblocks/client'
import { onMount } from 'svelte'
import LiveCursors from '../LiveCursors.svelte'
import ExampleWrapper from '$lib/ExampleWrapper.svelte'
import ExampleInfo from '$lib/ExampleInfo.svelte'
import { createRoomId } from '$lib/createRoomId'

let id
let loaded = false
let client

// Set up the client on load
// Check inside src/routes/api/auth.ts for the serverless function
onMount(() => {
  id = createRoomId()
  client = createClient({
    authEndpoint: '/api/auth'
  })
  loaded = true
})
</script>

<ExampleWrapper>

  {#if loaded}
    <!--
      These custom Providers work similarly to the `liveblocks-react` library
      https://liveblocks.io/docs/api-reference/liveblocks-react
      More info inside src/lib-liveblocks
    -->
    <LiveblocksProvider {client}>
      <RoomProvider id={'sveltekit-cursors-basic-' + id}>
        <LiveCursors />
      </RoomProvider>
    </LiveblocksProvider>
  {/if}

  <ExampleInfo
    title="Live Cursors Basic"
    description="Open this link in multiple windows to see the live cursors."
    githubHref="https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-cursors"
    codeSandboxHref="https://codesandbox.io/s/sveltekit-live-cursors-mfgdi7?file=/src/LiveCursors.svelte"
  />
</ExampleWrapper>
