import {
  applyOptimisticUpdates,
  type BaseMetadata,
  type CacheState,
  type ThreadData,
} from "@liveblocks/core";

import type { UseThreadsOptions } from "../../types";

export function selectedUserThreads<M extends BaseMetadata>(
  state: CacheState<M>
) {
  const result = applyOptimisticUpdates(state);

  // Filter threads to only include the non-deleted threads
  const threads = Object.values(result.threads).filter<ThreadData<M>>(
    (thread): thread is ThreadData<M> => {
      // We do not want to include threads that have been marked as deleted
      if (thread.deletedAt !== undefined) {
        return false;
      }

      return true;
    }
  );

  // Sort threads by updated date (newest first) and then created date
  return threads.sort(
    (a, b) =>
      (b.updatedAt ?? b.createdAt).getTime() -
      (a.updatedAt ?? a.createdAt).getTime()
  );
}

/**
 * @private Do not rely on this internal API.
 */
export function selectedThreads<M extends BaseMetadata>(
  roomId: string,
  state: CacheState<M>,
  options: UseThreadsOptions<M>
): ThreadData<M>[] {
  // Here, result contains copies of 3 out of the 5 caches with all optimistic
  // updates mixed in
  const result = applyOptimisticUpdates(state);

  // Filter threads to only include the non-deleted threads from the specified room and that match the specified filter options
  const threads = Object.values(result.threads).filter<ThreadData<M>>(
    (thread): thread is ThreadData<M> => {
      if (thread.roomId !== roomId) return false;

      // We do not want to include threads that have been marked as deleted
      if (thread.deletedAt !== undefined) {
        return false;
      }

      const query = options.query;
      if (!query) return true;

      // If the query includes 'resolved' filter and the thread's 'resolved' value does not match the query's 'resolved' value, exclude the thread
      if (query.resolved !== undefined && thread.resolved !== query.resolved) {
        return false;
      }

      for (const key in query.metadata) {
        const metadataValue = thread.metadata[key];
        const filterValue = query.metadata[key];

        if (
          assertFilterIsStartsWithOperator(filterValue) &&
          assertMetadataValueIsString(metadataValue)
        ) {
          if (metadataValue.startsWith(filterValue.startsWith)) {
            return true;
          }
        }

        if (metadataValue !== filterValue) {
          return false;
        }
      }

      return true;
    }
  );

  // Sort threads by creation date (oldest first)
  return threads.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

const assertFilterIsStartsWithOperator = (
  filter: boolean | string | number | undefined | { startsWith: string }
): filter is { startsWith: string } => {
  if (typeof filter === "object" && typeof filter.startsWith === "string") {
    return true;
  } else {
    return false;
  }
};

const assertMetadataValueIsString = (value: any): value is string => {
  return typeof value === "string";
};
