<script lang="ts">
import LiveblocksProvider from '../lib-liveblocks/LiveblocksProvider.svelte'
import RoomProvider from '../lib-liveblocks/RoomProvider.svelte'
import { createClient } from '@liveblocks/client'
import { onMount } from 'svelte'
import LiveAvatars from '../LiveAvatars.svelte'
import ExampleWrapper from '$lib/ExampleWrapper.svelte'
import { createRoomId } from '$lib/createRoomId'
import ExampleInfo from '$lib/ExampleInfo.svelte'

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

  <!--
      These custom Providers work similarly to the `liveblocks-react` library
      https://liveblocks.io/docs/api-reference/liveblocks-react
      More info inside src/lib-liveblocks
    -->
  {#if loaded}
    <LiveblocksProvider {client}>
      <RoomProvider id={'sveltekit-avatars-' + id}>
        <LiveAvatars />
      </RoomProvider>
    </LiveblocksProvider>
  {/if}

  <ExampleInfo
    title="Live Avatars"
    description="Open this link in multiple windows to see the live avatars."
    githubHref="https://github.com/liveblocks/liveblocks/tree/main/examples/sveltekit-live-avatars"
    codeSandboxHref="https://codesandbox.io/s/sveltekit-live-avatars-t4vetx?file=/src/LiveAvatars.svelte"
  />
</ExampleWrapper>
