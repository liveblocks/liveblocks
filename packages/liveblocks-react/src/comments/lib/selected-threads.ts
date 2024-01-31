import {
  applyOptimisticUpdates,
  type BaseMetadata,
  type CacheState,
  type ThreadData,
} from "@liveblocks/core";

import type { UseThreadsOptions } from "../../types";

export function selectedThreads<TThreadMetadata extends BaseMetadata>(
  roomId: string,
  state: CacheState<TThreadMetadata>,
  options: UseThreadsOptions<TThreadMetadata>
): ThreadData<TThreadMetadata>[] {
  const result = applyOptimisticUpdates(state);

  const threads = Object.values(result.threads).filter((thread) => {
    if (thread.roomId !== roomId) return false;

    const query = options.query;
    if (!query) return true;

    for (const key in query.metadata) {
      if (thread.metadata[key] !== query.metadata[key]) {
        return false;
      }
    }
    return true;
  });

  // Sort threads by creation date (oldest first)
  return threads.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
