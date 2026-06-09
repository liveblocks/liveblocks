import type { ClientWireCreateOp, ClientWireOp } from "../protocol/Op";
import { isCreateOp } from "../protocol/Op";

/**
 * A node's position in storage, encoded as `${parentId}\n${parentKey}`. Used as
 * the key of the position index, so that all pending Create ops targeting the
 * same spot bucket together.
 */
type PositionKey = `${string}\n${string}`;

/**
 * Read-only query surface over {@link UnacknowledgedOps}, handed to CRDTs so
 * they can look up their own still-pending Create ops without being able to
 * mutate the set (only the room adds/acks).
 */
export interface ReadonlyUnacknowledgedOps {
  /** Still-unacknowledged Create ops whose `parentId` is the given one. */
  getByParentId(parentId: string): Iterable<ClientWireCreateOp>;

  /**
   * Still-unacknowledged Create ops whose `parentId` and `parentKey` are both
   * the given ones (i.e. targeting one exact position).
   */
  getByParentIdAndKey(
    parentId: string,
    parentKey: string
  ): Iterable<ClientWireCreateOp>;

  /**
   * Whether the given pending op may already have been processed by the
   * server. True for ops that were in flight when a connection died: the
   * server may have stored them with the ack getting lost in the disconnect,
   * or may never have received them. Until the (re-sent) op's ack arrives,
   * the client cannot know which, so optimistic predictions that assume the
   * op has not been processed yet are unsound for these ops.
   */
  isPossiblyStored(opId: string): boolean;
}

/**
 * The client's still-unacknowledged ops.
 *
 * Maintains three indexes that stay in lockstep (the whole point of keeping
 * this in one place):
 *
 * - `#byOpId`: the primary record, `opId -> op`.
 * - `#createOpsByPosition`: `position -> (opId -> Create op)`. Finds the pending
 *   Create ops at one exact (parentId, parentKey) position in O(1), e.g. to
 *   resolve set acks. Nested because more than one pending Create op can target
 *   the same position (two rapid `set()`s at one index); keying the inner map
 *   by opId keeps it in lockstep with `#byOpId` under any ack order.
 * - `#createOpsByParent`: `parentId -> (opId -> Create op)`. Finds all pending
 *   Create ops under one parent node in O(1), regardless of position, e.g. a
 *   list's own optimistically-pushed items.
 *
 * Only Create ops carry a parent/position, so the two secondary indexes hold
 * exactly those.
 */
export class UnacknowledgedOps implements ReadonlyUnacknowledgedOps {
  // opId -> op
  #byOpId: Map<string, ClientWireOp> = new Map();
  // position -> (opId -> Create op)
  #createOpsByPosition: Map<PositionKey, Map<string, ClientWireCreateOp>> =
    new Map();
  // parentId -> (opId -> Create op)
  #createOpsByParent: Map<string, Map<string, ClientWireCreateOp>> = new Map();
  // opIds of pending ops that were in flight when a connection died, so the
  // server may already have processed them. See isPossiblyStored().
  #possiblyStoredOpIds: Set<string> = new Set();

  #posKey(parentId: string, parentKey: string): PositionKey {
    return `${parentId}\n${parentKey}`;
  }

  get size(): number {
    return this.#byOpId.size;
  }

  /**
   * Mark the given Op as still unacknowledged.
   */
  add(op: ClientWireOp): void {
    this.#byOpId.set(op.opId, op);

    if (isCreateOp(op)) {
      const posKey = this.#posKey(op.parentId, op.parentKey);
      let atPosition = this.#createOpsByPosition.get(posKey);
      if (atPosition === undefined) {
        atPosition = new Map();
        this.#createOpsByPosition.set(posKey, atPosition);
      }
      atPosition.set(op.opId, op);

      let inParent = this.#createOpsByParent.get(op.parentId);
      if (inParent === undefined) {
        inParent = new Map();
        this.#createOpsByParent.set(op.parentId, inParent);
      }
      inParent.set(op.opId, op);
    }
  }

  /**
   * Drop the op with the given opId from the set, because the server has
   * acknowledged it (confirmed our own op, or signalled it was seen but
   * ignored).
   */
  delete(opId: string): void {
    const op = this.#byOpId.get(opId);
    if (op === undefined) {
      return;
    }

    this.#byOpId.delete(opId);
    this.#possiblyStoredOpIds.delete(opId);

    if (isCreateOp(op)) {
      const posKey = this.#posKey(op.parentId, op.parentKey);
      const atPosition = this.#createOpsByPosition.get(posKey);
      atPosition?.delete(opId);
      if (atPosition !== undefined && atPosition.size === 0) {
        this.#createOpsByPosition.delete(posKey);
      }

      const inParent = this.#createOpsByParent.get(op.parentId);
      inParent?.delete(opId);
      if (inParent !== undefined && inParent.size === 0) {
        this.#createOpsByParent.delete(op.parentId);
      }
    }
  }

  /**
   * The still-unacknowledged Create ops with the given `parentId` and
   * `parentKey` (targeting one exact position), in dispatch order. O(1) lookup.
   * Empty if none.
   */
  getByParentIdAndKey(
    parentId: string,
    parentKey: string
  ): Iterable<ClientWireCreateOp> {
    return (
      this.#createOpsByPosition
        .get(this.#posKey(parentId, parentKey))
        ?.values() ?? []
    );
  }

  /**
   * The still-unacknowledged Create ops with the given `parentId` (across all
   * positions), in dispatch order. O(1) lookup. Empty if none.
   */
  getByParentId(parentId: string): Iterable<ClientWireCreateOp> {
    return this.#createOpsByParent.get(parentId)?.values() ?? [];
  }

  /** All still-unacknowledged ops, in dispatch order. */
  values(): IterableIterator<ClientWireOp> {
    return this.#byOpId.values();
  }

  isPossiblyStored(opId: string): boolean {
    return this.#possiblyStoredOpIds.has(opId);
  }

  /**
   * Mark every currently pending op as possibly stored on the server. Called
   * when the connection dies: all of these ops were in flight, and their
   * (possibly lost) acks would have been the only way to know their fate.
   */
  markAllAsPossiblyStored(): void {
    for (const opId of this.#byOpId.keys()) {
      this.#possiblyStoredOpIds.add(opId);
    }
  }
}
