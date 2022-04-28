import { LiveObject } from "@liveblocks/client";
import { useStorage } from "./useStorage";
import { onDestroy } from "svelte";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { useRoom } from "./useRoom";

/**
 * Works similarly to `liveblocks-react` useObject
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useObject
 *
 * The main difference is that it returns a Svelte store:
 * const obj = useObject()
 * $obj.set('name', 'Chris')
 * console.log($obj.get('name'))
 */
export function useObject(name: string, initial?: any): Writable<LiveObject> {
  const room = useRoom();
  const rootStore = useStorage();
  const list = writable<LiveObject>();
  let unsubscribe = () => {};

  const unsubscribeRoot = rootStore.subscribe((root) => {
    if (!root) {
      return;
    }

    if (!root.get(name)) {
      root.set(name, new LiveObject(initial));
    }

    list.set(root.get(name));

    unsubscribe();
    unsubscribe = room.subscribe(root.get(name) as LiveObject, (newObject) => {
      list.set(newObject);
    });
  });

  onDestroy(unsubscribeRoot);

  return list;
}
