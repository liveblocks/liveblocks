import type { LiveObject } from "@liveblocks/client";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { useRoom } from "./useRoom";

/**
 * No `liveblocks-react` public API equivalent, but useStorage is used internally
 */
export function useStorage(): Writable<LiveObject> {
  const room = useRoom();
  const rootStore = writable<LiveObject>();

  async function fetchStorage() {
    const { root }: { root: LiveObject } = await room!.getStorage();
    rootStore.set(root);
  }

  fetchStorage();

  return rootStore;
}
