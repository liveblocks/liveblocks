import type {
  BaseMetadata,
  ThreadData,
  ThreadDataWithDeleteInfo,
} from "@liveblocks/core";
import { SortedList } from "@liveblocks/core";

function isThreadDeleted<M extends BaseMetadata>(
  thread: ThreadDataWithDeleteInfo<M>
): thread is ThreadDataWithDeleteInfo<M> & { deletedAt: Date } {
  // XXX Maybe do the comments.some() check when _adding_ the thread to the
  // pool, and setting the deletedAt field otherwise. This would avoid having
  // to do this check on every read.
  return !!thread.deletedAt || thread.comments.some((c) => !!c.deletedAt);
}

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

  public get version() {
    return this._version;
  }

  public getEvenIfDeleted(
    threadId: string
  ): ThreadDataWithDeleteInfo<M> | undefined {
    return this._byId.get(threadId);
  }

  public get(threadId: string): ThreadData<M> | undefined {
    const thread = this.getEvenIfDeleted(threadId);
    if (thread && isThreadDeleted(thread)) {
      return undefined;
    }
    return thread;
  }

  // XXX Rename to upsert?
  public add(thread: ThreadDataWithDeleteInfo<M>): void {
    const key = thread.id;
    this.removeById(key);

    if (!isThreadDeleted(thread)) {
      this._asc.add(thread);
      this._desc.add(thread);
    }
    this._byId.set(key, thread);
    this.touch();
  }

  public removeById(threadId: string): void {
    const toRemove = this._byId.get(threadId);
    if (toRemove !== undefined) {
      this._asc.remove(toRemove);
      this._desc.remove(toRemove);
      this._byId.delete(threadId);
      this.touch();
    }
  }

  public findMany(
    // XXX Implement more query filters and caching here
    query: { roomId: string },
    direction: "asc" | "desc"
  ): readonly ThreadData<M>[] {
    const index = direction === "desc" ? this._desc : this._asc;
    return Array.from(index.filter((t) => t.roomId === query.roomId));
  }

  private touch() {
    ++this._version;
  }
}
