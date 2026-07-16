import type { ClientWireCreateOp, ClientWireOp } from "./protocol/Op";
import { isCreateOp } from "./protocol/Op";

/**
 * A node's position in storage, encoded as `${parentId}\n${parentKey}`.
 */
type PositionKey = `${string}\n${string}`;

/**
 * @internal Read-only query surface over {@link PendingOps}, used by CRDTs
 * (e.g. LiveList) to look up still-pending Create ops without mutating the set.
 */
export interface ReadonlyPendingOps {
  readonly size: number;

  /** Still-pending Create ops whose `parentId` is the given one. */
  getByParentId(parentId: string): Iterable<ClientWireCreateOp>;

  /**
   * Still-pending Create ops whose `parentId` and `parentKey` are both the
   * given ones (i.e. targeting one exact position).
   */
  getByParentIdAndKey(
    parentId: string,
    parentKey: string
  ): Iterable<ClientWireCreateOp>;

  /**
   * Whether the given pending op may already have been processed by a remote
   * authority (e.g. server). True for ops that were in flight when a
   * connection died.
   */
  isPossiblyStored(opId: string): boolean;
}

/**
 * @internal Local ops that have been emitted but not yet confirmed (acked).
 *
 * Owned by {@link StorageDoc}. Sync layers confirm via StorageDoc
 * (`apply` with opIds, `confirm`, `markAllAsPossiblyStored`).
 */
export class PendingOps implements ReadonlyPendingOps {
  #byOpId: Map<string, ClientWireOp> = new Map();
  #createOpsByPosition: Map<PositionKey, Map<string, ClientWireCreateOp>> =
    new Map();
  #createOpsByParent: Map<string, Map<string, ClientWireCreateOp>> = new Map();
  #possiblyStoredOpIds: Set<string> = new Set();

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

      let inParent = this.#createOpsByParent.get(op.parentId);
      if (inParent === undefined) {
        inParent = new Map();
        this.#createOpsByParent.set(op.parentId, inParent);
      }
      inParent.set(op.opId, op);
    }
  }

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

  getByParentId(parentId: string): Iterable<ClientWireCreateOp> {
    return this.#createOpsByParent.get(parentId)?.values() ?? [];
  }

  values(): IterableIterator<ClientWireOp> {
    return this.#byOpId.values();
  }

  isPossiblyStored(opId: string): boolean {
    return this.#possiblyStoredOpIds.has(opId);
  }

  markAllAsPossiblyStored(): void {
    for (const opId of this.#byOpId.keys()) {
      this.#possiblyStoredOpIds.add(opId);
    }
  }
}
