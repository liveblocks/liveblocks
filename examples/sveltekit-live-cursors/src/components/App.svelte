<script lang="ts">
  import { useMyPresence, useOthers } from "../lib";
  import Cursor from "./Cursor.svelte";

  type Cursor = {
    x: number;
    y: number;
  };

  type Presence = {
    cursor: Cursor | null;
  };

  const COLORS = [
    "#E57373",
    "#9575CD",
    "#4FC3F7",
    "#81C784",
    "#FFF176",
    "#FF8A65",
    "#F06292",
    "#7986CB",
  ];

  /**
   * The main Liveblocks code for the example.
   * Check in src/routes/index.svelte to see the setup code.
   *
   * The two hooks below work similarly to the `liveblocks-react` library
   * https://liveblocks.io/docs/api-reference/liveblocks-react
   */

  let myPresence = useMyPresence<Presence>();
  let others = useOthers<Presence>();

  // Update cursor presence to current mouse location
  function handleMousemove(event: MouseEvent) {
    myPresence.update({
      cursor: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
      },
    });
  }

  // When the mouse leaves the page, set cursor presence to null
  function handleMouseleave() {
    myPresence.update({
      cursor: null,
    });
  }
</script>

<main on:mouseleave={handleMouseleave} on:mousemove={handleMousemove}>
  <!-- Show the current user's cursor location -->
  <div class="text">
    {$myPresence?.cursor
      ? `${$myPresence.cursor.x} × ${$myPresence.cursor.y}`
      : "Move your cursor to broadcast its position to other people in the room."}
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
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    place-content: center;
    place-items: center;
  }

  .text {
    max-width: 380px;
    text-align: center;
  }
</style>
