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

  // Filter threads to only include the non-deleted threads from the specified room and that match the specified filter options
  const threads = Object.values(result.threads).filter<
    ThreadData<TThreadMetadata>
  >((thread): thread is ThreadData<TThreadMetadata> => {
    if (thread.roomId !== roomId) return false;

    // We do not want to include threads that have been marked as deleted
    if (thread.deletedAt !== undefined) {
      return false;
    }

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
