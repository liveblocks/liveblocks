import type { Others, Presence } from "@liveblocks/client";
import { onDestroy } from "svelte";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { useRoom } from "./useRoom";

/**
 * Works similarly to `liveblocks-react` useOthers
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useOthers
 *
 * The main difference is that it returns a Svelte store:
 * const others = useOthers()
 * console.log($others.value)
 * {#each [...$others] as other}
 *    ...
 */
export function useOthers<T extends Presence = Presence>(): Writable<
  Others<T>
> {
  const room = useRoom();
  const others = writable<Others<T>>();

  const unsubscribe = room.subscribe("others", (newOthers: Others<T>) => {
    others.set(newOthers);
  });

  onDestroy(unsubscribe);

  return others;
}
