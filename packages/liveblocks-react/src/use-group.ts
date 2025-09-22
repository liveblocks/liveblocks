import {
  type AsyncResult,
  type GroupData,
  kInternal,
  shallow,
} from "@liveblocks/core";
import { useCallback, useEffect } from "react";

import { useClient } from "./contexts";
import type { GroupAsyncResult } from "./types";
import { useSyncExternalStoreWithSelector } from "./use-sync-external-store-with-selector";

function selectorFor_useGroup(
  state: AsyncResult<GroupData | undefined> | undefined
): GroupAsyncResult {
  if (state === undefined || state?.isLoading) {
    return state ?? { isLoading: true };
  }

  if (state.error) {
    return state;
  }

  return {
    isLoading: false,
    group: state.data,
  };
}

/** @private - Internal API, do not rely on it. */
export function useGroup(groupId: string): GroupAsyncResult {
  const client = useClient();
  const store = client[kInternal].httpClient.groupsStore;

  const getGroupState = useCallback(
    () => store.getItemState(groupId),
    [store, groupId]
  );

  useEffect(() => {
    void store.enqueue(groupId);
  }, [store, groupId]);

  return useSyncExternalStoreWithSelector(
    store.subscribe,
    getGroupState,
    getGroupState,
    selectorFor_useGroup,
    shallow
  );
}
