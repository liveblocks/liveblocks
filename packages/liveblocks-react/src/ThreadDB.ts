import type {
  BaseMetadata,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import { SortedList } from "@liveblocks/core";

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
 * Think of this class as a lightweight, in-memory, "database" for all Thread
 * instances. You can efficient .get() them by their thread ID, or efficiently
 * iterate over all of them, ordered by either createdAt ASC or updatedAt DESC.
 */
export class ThreadDB<M extends BaseMetadata> {
  private _byId: Map<string, ThreadDataWithDeleteInfo<M>>;
  private _asc: SortedList<ThreadDataWithDeleteInfo<M>>;
  private _desc: SortedList<ThreadDataWithDeleteInfo<M>>;
  private _version: number; // The version is auto-incremented on every mutation and can be used as a reliable indicator to tell if the contents of the thread pool has changed

  constructor() {
    this._asc = SortedList.from<ThreadDataWithDeleteInfo<M>>([], (t1, t2) => {
      const d1 = t1.createdAt;
      const d2 = t2.createdAt;
      return d1 < d2 ? true : d1 === d2 ? t1.id < t2.id : false;
    });

    this._desc = SortedList.from<ThreadDataWithDeleteInfo<M>>([], (t1, t2) => {
      const d2 = t2.updatedAt;
      const d1 = t1.updatedAt;
      return d2 < d1 ? true : d2 === d1 ? t2.id < t1.id : false;
    });

    this._byId = new Map();
    this._version = 0;
  }

  public clone(): ThreadDB<M> {
    const newPool = new ThreadDB<M>();
    newPool._byId = new Map(this._byId);
    newPool._asc = this._asc.clone();
    newPool._desc = this._desc.clone();
    newPool._version = this._version;
    return newPool;
  }

  public get version() {
    return this._version;
  }

  public getEvenIfDeleted(
    threadId: string
  ): ThreadDataWithDeleteInfo<M> | undefined {
    return this._byId.get(threadId);
  }

  /**
   * Returns the (non-deleted) thread for the given thread ID.
   */
  public get(threadId: string): ThreadData<M> | undefined {
    const thread = this.getEvenIfDeleted(threadId);
    return thread?.deletedAt ? undefined : thread;
  }

  public upsert(thread: ThreadDataWithDeleteInfo<M>): void {
    thread = sanitizeThread(thread);

    const key = thread.id;
    this._removeById(key);

    if (!thread.deletedAt) {
      this._asc.add(thread);
      this._desc.add(thread);
    }
    this._byId.set(key, thread);
    this.touch();
  }

  private _removeById(threadId: string): void {
    const toRemove = this._byId.get(threadId);
    if (toRemove !== undefined) {
      this._asc.remove(toRemove);
      this._desc.remove(toRemove);
      this._byId.delete(threadId);
      this.touch();
    }
  }

  public delete(threadId: string, deletedAt: Date): void {
    const existing = this._byId.get(threadId);
    if (existing && !existing.deletedAt) {
      this.upsert({ ...existing, deletedAt, updatedAt: deletedAt });
    }
  }

  public findMany(
    // XXX Implement caching here
    roomId: string | undefined,
    _query: {
      henk?: "implement me"; // XXX XXX Add query filters here!
    },
    direction: "asc" | "desc"
  ): readonly ThreadData<M>[] {
    const index = direction === "desc" ? this._desc : this._asc;
    return Array.from(
      index.filter((t) => {
        return roomId !== undefined ? t.roomId === roomId : true;
      })
    );
  }

  private touch() {
    ++this._version;
  }

  public _toRecord(): Record<string, ThreadDataWithDeleteInfo<M>> {
    return Object.fromEntries(this._byId.entries());
  }
}
