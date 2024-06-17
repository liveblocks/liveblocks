<script lang="ts">
  import { type Client, createClient, type Room } from "@liveblocks/client";
  import { onDestroy, onMount } from "svelte";
  import App from "../components/App.svelte";

  let room: Room;
  let leave: () => void;
  let roomId = "liveblocks:examples:sveltekit-live-avatars";

  // Presence represents the properties that will exist on every User in the
  // Room and that will automatically be kept in sync. Accessible through the
  // `user.presence` property. Must be JSON-serializable.
  type Presence = {
    // cursor: { x: number, y: number } | null,
    // ...
  };

  // Optionally, Storage represents the shared document that persists in the
  // Room, even after all Users leave. Fields under Storage typically are
  // LiveList, LiveMap, LiveObject instances, for which updates are
  // automatically persisted and synced to all connected clients.
  type Storage = {
    // animals: LiveList<string>,
    // ...
  };

  // Optionally, UserMeta represents static/readonly metadata on each User, as
  // provided by your own custom auth backend (if used). Useful for data that
  // will not change during a session, like a User's name or avatar.
  // type UserMeta = {
  //   id?: string,  // Accessible through `user.id`
  //   info?: Json,  // Accessible through `user.info`
  // };

  // Optionally, the type of custom events broadcasted and listened for in this
  // room. Must be JSON-serializable.
  // type RoomEvent = {};

  // Set up the client on load
  // Check inside src/routes/api/liveblocks-auth.ts for the serverless function
  onMount(() => {
    applyExampleRoomId();

    const client = createClient({
      authEndpoint: "/api/liveblocks-auth",
    });

    const info = client.enterRoom<Presence, Storage /* UserMeta, RoomEvent */>(roomId);

    room = info.room;
    leave = info.leave;
  });

  onDestroy(() => {
    leave?.();
  });

  /**
   * This function is used when deploying an example on liveblocks.io.
   * You can ignore it completely if you run the example locally.
   */
  function applyExampleRoomId() {
    if (typeof window === "undefined") {
      return;
    }

    const query = new URLSearchParams(window?.location?.search);
    const exampleId = query.get("exampleId");

    if (exampleId) {
      roomId = exampleId ? `${roomId}-${exampleId}` : roomId;
    }
  }
</script>

{#if room}
  <App {room} />
{/if}
