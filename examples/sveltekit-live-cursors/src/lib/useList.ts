import { LiveList } from "@liveblocks/client";
import { useStorage } from "./useStorage";
import { onDestroy } from "svelte";
import type { Writable } from "svelte/store";
import { writable } from "svelte/store";
import { useRoom } from "./useRoom";

/**
 * Works similarly to `liveblocks-react` useList
 * https://liveblocks.io/docs/api-reference/liveblocks-react#useList
 *
 * The main difference is that it returns a Svelte store:
 * const list = useList()
 * $list.push([{ item: 1 }])
 * console.log([...$list])
 */
export function useList<T>(
  name: string,
  initial?: any[]
): Writable<LiveList<T>> {
  const room = useRoom();
  const rootStore = useStorage();
  const list = writable<LiveList<T>>();
  let unsubscribe = () => {};

  const unsubscribeRoot = rootStore.subscribe((root) => {
    if (!root) {
      return;
    }

    if (!root.get(name)) {
      root.set(name, new LiveList<T>(initial));
    }

    list.set(root.get(name));

    unsubscribe();
    unsubscribe = room.subscribe(root.get(name) as LiveList<T>, (newList) => {
      list.set(newList);
    });
  });

  onDestroy(unsubscribeRoot);

  return list;
}
