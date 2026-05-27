import type { ClientWireCreateOp, ClientWireOp } from "../protocol/Op";
import { isCreateOp } from "../protocol/Op";

/**
 * A node's position in storage, encoded as `${parentId}\n${parentKey}`. Used as
 * the key of the position index, so that all pending Create ops targeting the
 * same spot bucket together.
 */
type PositionKey = `${string}\n${string}`;

/**
 * The client's still-unacknowledged ops.
 *
 * Maintains two indexes that stay in lockstep (the whole point of keeping this
 * in one place):
 *
 * - `#byOpId`: the primary record, `opId → op`.
 * - `#createOpsByPosition`: a secondary index, `position → (opId → Create op)`.
 *   Lets CRDTs find the pending ops at a given position in O(1), without
 *   scanning the whole set. Only Create ops carry a position, so this index
 *   holds exactly those.
 *
 * The position index is nested (a map of maps) rather than flat
 * (`position → op`) because more than one pending Create op can target the same
 * position at once. For example, two rapid `set()`s at the same index each emit
 * a Create op with the same `parentKey`. Keying the inner map by opId lets
 * {@link delete} remove exactly the acked op, keeping this index in lockstep
 * with `#byOpId` regardless of the order acks arrive.
 */
export class UnacknowledgedOps {
  // opId → op
  #byOpId: Map<string, ClientWireOp> = new Map();
  // position → (opId → Create op)
  #createOpsByPosition: Map<PositionKey, Map<string, ClientWireCreateOp>> =
    new Map();

  #posKey(parentId: string, parentKey: string): PositionKey {
    return `${parentId}\n${parentKey}`;
  }

  get size(): number {
    return this.#byOpId.size;
  }

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

    if (isCreateOp(op)) {
      const posKey = this.#posKey(op.parentId, op.parentKey);
      const atPosition = this.#createOpsByPosition.get(posKey);
      atPosition?.delete(opId);
      if (atPosition !== undefined && atPosition.size === 0) {
        this.#createOpsByPosition.delete(posKey);
      }
    }
  }

  /**
   * The still-unacknowledged Create ops at the given (parentId, parentKey)
   * position, in dispatch order. O(1) lookup. Empty if none.
   */
  getAt(parentId: string, parentKey: string): Iterable<ClientWireCreateOp> {
    return this.#createOpsByPosition.get(this.#posKey(parentId, parentKey))?.values() ?? [];
  }

  /** All still-unacknowledged ops, in dispatch order. */
  values(): IterableIterator<ClientWireOp> {
    return this.#byOpId.values();
  }
}
