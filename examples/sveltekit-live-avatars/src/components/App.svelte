<script>
  import { useOthers, useSelf } from "../lib";
  import Avatar from "./Avatar.svelte";

  /**
   * The main Liveblocks code for the example.
   * Check in src/routes/index.svelte to see the setup code.
   *
   * The two hooks below work similarly to the `liveblocks-react` library
   * https://liveblocks.io/docs/api-reference/liveblocks-react
   */

  let users = useOthers();
  let currentUser = useSelf();
  $: hasMoreUsers = $users ? [...$users].length > 3 : false;
</script>

<main>
  <div class="avatars">
    <!-- Show the first 3 users avatars -->
    {#if $users}
      {#each [...$users].slice(0, 3) as { connectionId, info } (connectionId)}
        <Avatar picture={info?.picture} name={info?.name} />
      {/each}
    {/if}

    <!-- Show the amount of people online past the third user -->
    {#if hasMoreUsers}
      <div class="more">+ {[...$users]?.length - 3}</div>
    {/if}

    <!-- Show the current user's avatar-->
    {#if $currentUser}
      <div class="current_user_container">
        <Avatar
          picture={$currentUser.info?.picture}
          name={$currentUser.info?.name}
        />
      </div>
    {/if}
  </div>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    user-select: none;
  }

  .avatars {
    display: flex;
    flex-direction: row;
    padding-left: 0.75rem;
  }

  .current_user_container {
    position: relative;
    margin-left: 2rem;
  }

  .more {
    display: flex;
    place-content: center;
    place-items: center;
    position: relative;
    border: 4px solid #fff;
    border-radius: 9999px;
    width: 56px;
    height: 56px;
    background-color: #9ca3af;
    margin-left: -0.75rem;
    color: #fff;
  }
</style>
