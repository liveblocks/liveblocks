import type {
  BaseMetadata,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import { SortedList } from "@liveblocks/core";

import { makeThreadsFilter } from "./lib/querying";
import type { ThreadsQuery } from "./types";

function sanitizeThread<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>
): ThreadDataWithDeleteInfo<M> {
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

export type ReadonlyThreadDB<M extends BaseMetadata> = Omit<
  ThreadDB<M>,
  "upsert" | "delete"
>;

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
export class ThreadDB<M extends BaseMetadata> {
  private _byId: Map<string, ThreadDataWithDeleteInfo<M>>;
  private _asc: SortedList<ThreadData<M>>;
  private _desc: SortedList<ThreadData<M>>;
  private _version: number; // The version is auto-incremented on every mutation and can be used as a reliable indicator to tell if the contents of the thread pool has changed

  constructor() {
    this._asc = SortedList.from<ThreadData<M>>([], (t1, t2) => {
      const d1 = t1.createdAt;
      const d2 = t2.createdAt;
      return d1 < d2 ? true : d1 === d2 ? t1.id < t2.id : false;
    });

    this._desc = SortedList.from<ThreadData<M>>([], (t1, t2) => {
      const d2 = t2.updatedAt;
      const d1 = t1.updatedAt;
      return d2 < d1 ? true : d2 === d1 ? t2.id < t1.id : false;
    });

    this._byId = new Map();
    this._version = 0;
  }

  //
  // Public APIs
  //

  public clone(): ThreadDB<M> {
    const newPool = new ThreadDB<M>();
    newPool._byId = new Map(this._byId);
    newPool._asc = this._asc.clone();
    newPool._desc = this._desc.clone();
    newPool._version = this._version;
    return newPool;
  }

  /** Gets the transaction count for this DB. Increments any time the DB is modified. */
  public get version() {
    return this._version;
  }

  /** Returns an existing thread by ID. Will never return a deleted thread. */
  public get(threadId: string): ThreadData<M> | undefined {
    const thread = this.getEvenIfDeleted(threadId);
    return thread?.deletedAt ? undefined : thread;
  }

  /** Returns the (possibly deleted) thread by ID. */
  public getEvenIfDeleted(
    threadId: string
  ): ThreadDataWithDeleteInfo<M> | undefined {
    return this._byId.get(threadId);
  }

  /** Adds or updates a thread in the DB. If the newly given thread is a deleted one, it will get deleted. */
  public upsert(thread: ThreadDataWithDeleteInfo<M>): void {
    thread = sanitizeThread(thread);

    const id = thread.id;

    const toRemove = this._byId.get(id);
    if (toRemove) {
      // Don't do anything if the existing thread is already deleted!
      if (toRemove.deletedAt) return;

      this._asc.remove(toRemove);
      this._desc.remove(toRemove);
    }

    if (!thread.deletedAt) {
      this._asc.add(thread);
      this._desc.add(thread);
    }
    this._byId.set(id, thread);
    this.touch();
  }

  /** Like .upsert(), except it won't update if a thread by this ID already exists. */
  // TODO Consider renaming this to just .upsert(). I'm not sure if we really
  // TODO need the raw .upsert(). Would be nice if this behavior was the default.
  public upsertIfNewer(thread: ThreadDataWithDeleteInfo<M>): void {
    const existing = this.get(thread.id);
    if (!existing || thread.updatedAt >= existing.updatedAt) {
      this.upsert(thread);
    }
  }

  /**
   * Marks a thread as deleted. It will no longer pop up in .findMany()
   * queries, but it can still be accessed via `.getEvenIfDeleted()`.
   */
  public delete(threadId: string, deletedAt: Date): void {
    const existing = this._byId.get(threadId);
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
   */
  public findMany(
    // XXX Implement caching here
    roomId: string | undefined,
    query: ThreadsQuery<M>,
    direction: "asc" | "desc"
  ): ThreadData<M>[] {
    const index = direction === "desc" ? this._desc : this._asc;
    const crit: ((thread: ThreadData<M>) => boolean)[] = [];
    if (roomId !== undefined) {
      crit.push((t) => t.roomId === roomId);
    }
    crit.push(makeThreadsFilter(query));
    return Array.from(index.filter((t) => crit.every((pred) => pred(t))));
  }

  //
  // Private APIs
  //

  private touch() {
    ++this._version;
  }
}
