import { onDestroy } from "svelte";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { useRoom } from "./useRoom";

/**
 * Works similarly to `liveblocks-react` useSelf
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useSelf
 *
 * The main difference is that it returns a Svelte store:
 * const self = useSelf()
 * console.log($self.info.id)
 * <div>{$self.info.name}</div>
 */
export function useSelf(): Writable<any> {
  const room = useRoom();
  const self = writable();

  const unsubscribeConnection = room.subscribe("connection", () => {
    self.set(room.getSelf());
  });
  const unsubscribe = room.subscribe("my-presence", () => {
    self.set(room.getSelf());
  });

  onDestroy(() => {
    unsubscribeConnection();
    unsubscribe();
  });

  return self;
}
