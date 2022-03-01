<script>
  import { useMyPresence, useOthers } from './lib-liveblocks/index.ts'
  import Cursor from '$lib/Cursor.svelte'
  const COLORS = ['#E57373', '#9575CD', '#4FC3F7', '#81C784', '#FFF176', '#FF8A65', '#F06292', '#7986CB']

  /**
   * The main Liveblocks code for the example.
   * Check in src/routes/index.svelte to see the setup code.
   *
   * The two hooks below work similarly to the `liveblocks-react` library
   * https://liveblocks.io/docs/api-reference/liveblocks-react
   * More info inside src/lib-liveblocks
   */

  let myPresence = useMyPresence()
  let others = useOthers()

  // Update cursor presence to current mouse location
  function handleMousemove (event) {
    myPresence.update({
      cursor: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY)
      }
    })
  }

  // When the mouse leaves the page, set cursor presence to null
  function handleMouseleave () {
    myPresence.update({
      cursor: null
    })
  }
</script>

<main
  on:mousemove={handleMousemove}
  on:mouseleave={handleMouseleave}
>

  <!-- Show the current user's cursor location -->
  <div class="max-w-sm text-center">
    {#if $myPresence?.cursor}
      {$myPresence.cursor.x},{$myPresence.cursor.y}
    {:else}
      Move your cursor to broadcast its position to other people in the room.
    {/if}
  </div>

  <!-- When others connected, iterate through others and show their cursors -->
  {#if $others}
    {#each [...$others] as { connectionId, presence } (connectionId)}
      {#if presence?.cursor}
        <Cursor
          color={COLORS[connectionId % COLORS.length]}
          x={presence.cursor.x}
          y={presence.cursor.y}
        />
      {/if}
    {/each}
  {/if}

</main>

<style>
  main {
    position: relative;
    height: 100vh;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
