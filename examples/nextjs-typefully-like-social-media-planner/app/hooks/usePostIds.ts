import { useMutation, useRoom, useStorage } from "@liveblocks/react";
import { nanoid } from "nanoid";
import { useCallback } from "react";

export function usePostIds() {
  const room = useRoom();
  const localStorageId = `localPostIds::${room.id}`;
  const storagePostIds = useStorage((root) => root.postIds);

  const syncWithLocalStorage = useCallback(
    (ids: readonly string[]) => {
      localStorage.setItem(
        `localPostIds::${localStorageId}`,
        JSON.stringify(ids)
      );
    },
    [localStorageId]
  );

  const getFromLocalStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const val = localStorage.getItem(`localPostIds::${localStorageId}`);
    return val ? (JSON.parse(val) as string[]) : [];
  }, [localStorageId]);

  const insertPostAfter = useMutation(
    ({ storage }, currentPostId: string) => {
      const ids = storage.get("postIds");
      const index = ids.indexOf(currentPostId);
      ids.insert(nanoid(), index + 1);

      syncWithLocalStorage(ids.toImmutable());
    },
    [syncWithLocalStorage]
  );

  const removePost = useMutation(
    ({ storage }, postId: string) => {
      const ids = storage.get("postIds");
      const index = ids.indexOf(postId);
      ids.delete(index);

      syncWithLocalStorage(ids.toImmutable());
    },
    [syncWithLocalStorage]
  );

  const postIds =
    storagePostIds === null ? getFromLocalStorage() : storagePostIds;

  return { postIds, insertPostAfter, removePost };
}
