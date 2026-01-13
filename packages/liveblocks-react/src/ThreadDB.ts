import type {
  BaseMetadata,
  SubscriptionData,
  SubscriptionKey,
  ThreadData,
  ThreadDataWithDeleteInfo,
  ThreadDeleteInfo,
} from "@liveblocks/core";
import { batch, MutableSignal, SortedList } from "@liveblocks/core";

import { makeThreadsFilter } from "./lib/querying";
import type { ThreadsQuery } from "./types";

function sanitizeThread<TM extends BaseMetadata, CM extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<TM, CM>
): ThreadDataWithDeleteInfo<TM, CM> {
  // First, if a thread has a deletedAt date, it should not have any comments
  if (thread.deletedAt) {
    // Thread is deleted, it should wipe all comments
    if (thread.comments.length > 0) {
      return { ...thread, comments: [] };
    }
  }

  // Otherwise, if a thread is not deleted, it _should_ have at least one non-deleted comment
  const hasComment = thread.comments.some((c) => !c.deletedAt);
  if (!hasComment) {
    // Delete it after all if it doesn't have at least one comment
    return { ...thread, deletedAt: new Date(), comments: [] };
  }

  return thread;
}

export type ReadonlyThreadDB<
  TM extends BaseMetadata,
  CM extends BaseMetadata,
> = Omit<ThreadDB<TM, CM>, "upsert" | "delete" | "signal">;

/**
 * This class implements a lightweight, in-memory, "database" for all Thread
 * instances.
 *
 * It exposes the following methods:
 *
 * - upsert: To add/update a thread
 * - upsertIfNewer: To add/update a thread. Only update an existing thread if
 *                  its newer
 * - delete: To mark existing threads as deleted
 * - get: To get any non-deleted thread
 * - getEvenIfDeleted: To get a thread which is possibly deleted
 * - findMany: To filter an ordered list of non-deleted threads
 * - clone: To clone the DB to mutate it further. This is used to mix in
 *          optimistic updates without losing the original thread contents.
 *
 */
export class ThreadDB<TM extends BaseMetadata, CM extends BaseMetadata> {
  #byId: Map<string, ThreadDataWithDeleteInfo<TM, CM>>;
  #asc: SortedList<ThreadData<TM, CM>>;
  #desc: SortedList<ThreadData<TM, CM>>;

  // This signal will be notified on every mutation
  public readonly signal: MutableSignal<this>;

  constructor() {
    this.#asc = SortedList.from<ThreadData<TM, CM>>([], (t1, t2) => {
      const d1 = t1.createdAt;
      const d2 = t2.createdAt;
      return d1 < d2 ? true : d1 === d2 ? t1.id < t2.id : false;
    });

    this.#desc = SortedList.from<ThreadData<TM, CM>>([], (t1, t2) => {
      const d2 = t2.updatedAt;
      const d1 = t1.updatedAt;
      return d2 < d1 ? true : d2 === d1 ? t2.id < t1.id : false;
    });

    this.#byId = new Map();

    this.signal = new MutableSignal(this);
  }

  //
  // Public APIs
  //

  public clone(): ThreadDB<TM, CM> {
    const newPool = new ThreadDB<TM, CM>();
    newPool.#byId = new Map(this.#byId);
    newPool.#asc = this.#asc.clone();
    newPool.#desc = this.#desc.clone();
    return newPool;
  }

  /** Returns an existing thread by ID. Will never return a deleted thread. */
  public get(threadId: string): ThreadData<TM, CM> | undefined {
    const thread = this.getEvenIfDeleted(threadId);
    return thread?.deletedAt ? undefined : thread;
  }

  /** Returns the (possibly deleted) thread by ID. */
  public getEvenIfDeleted(
    threadId: string
  ): ThreadDataWithDeleteInfo<TM, CM> | undefined {
    return this.#byId.get(threadId);
  }

  /** Adds or updates a thread in the DB. If the newly given thread is a deleted one, it will get deleted. */
  public upsert(thread: ThreadDataWithDeleteInfo<TM, CM>): void {
    this.signal.mutate(() => {
      thread = sanitizeThread(thread);

      const id = thread.id;

      const toRemove = this.#byId.get(id);
      if (toRemove) {
        // Don't do anything if the existing thread is already deleted!
        if (toRemove.deletedAt) return false;

        this.#asc.remove(toRemove);
        this.#desc.remove(toRemove);
      }

      if (!thread.deletedAt) {
        this.#asc.add(thread);
        this.#desc.add(thread);
      }
      this.#byId.set(id, thread);
      return true;
    });
  }

  /** Like .upsert(), except it won't update if a thread by this ID already exists. */
  // TODO Consider renaming this to just .upsert(). I'm not sure if we really
  // TODO need the raw .upsert(). Would be nice if this behavior was the default.
  public upsertIfNewer(thread: ThreadDataWithDeleteInfo<TM, CM>): void {
    const existing = this.get(thread.id);
    if (!existing || thread.updatedAt >= existing.updatedAt) {
      this.upsert(thread);
    }
  }

  public applyDelta(
    newThreads: ThreadData<TM, CM>[],
    deletedThreads: ThreadDeleteInfo[]
  ): void {
    batch(() => {
      // Add new threads or update existing threads if the existing thread is older than the new thread.
      for (const thread of newThreads) {
        this.upsertIfNewer(thread);
      }

      // Mark threads in the deletedThreads list as deleted
      for (const { id, deletedAt } of deletedThreads) {
        const existing = this.getEvenIfDeleted(id);
        if (!existing) continue;
        this.delete(id, deletedAt);
      }
    });
  }

  /**
   * Marks a thread as deleted. It will no longer pop up in .findMany()
   * queries, but it can still be accessed via `.getEvenIfDeleted()`.
   */
  public delete(threadId: string, deletedAt: Date): void {
    const existing = this.#byId.get(threadId);
    if (existing && !existing.deletedAt) {
      this.upsert({ ...existing, deletedAt, updatedAt: deletedAt });
    }
  }

  /**
   * Returns all threads matching a given roomId and query. If roomId is not
   * specified, it will return all threads matching the query, across all
   * rooms.
   *
   * Returns the results in the requested order. Please note:
   *   'asc'  means by createdAt ASC
   *   'desc' means by updatedAt DESC
   *
   * Will never return deleted threads in the result.
   *
   * Subscriptions are needed to filter threads based on the user's subscriptions.
   */
  public findMany(
    // TODO: Implement caching here
    roomId: string | undefined,
    query: ThreadsQuery<TM> | undefined,
    direction: "asc" | "desc",
    subscriptions?: Record<SubscriptionKey, SubscriptionData>
  ): ThreadData<TM, CM>[] {
    const index = direction === "desc" ? this.#desc : this.#asc;
    const crit: ((thread: ThreadData<TM, CM>) => boolean)[] = [];
    if (roomId !== undefined) {
      crit.push((t) => t.roomId === roomId);
    }
    if (query !== undefined) {
      crit.push(makeThreadsFilter(query, subscriptions));
    }
    return Array.from(index.filter((t) => crit.every((pred) => pred(t))));
  }
}
