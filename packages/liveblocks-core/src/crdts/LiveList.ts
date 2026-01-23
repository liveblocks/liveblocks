import { nn } from "../lib/assert";
import { nanoid } from "../lib/nanoid";
import type { Pos } from "../lib/position";
import { asPos, makePosition } from "../lib/position";
import { SortedList } from "../lib/SortedList";
import type { ClientWireOp, CreateListOp, CreateOp, Op } from "../protocol/Op";
import { OpCode } from "../protocol/Op";
import type { ListStorageNode, SerializedList } from "../protocol/StorageNode";
import { CrdtType } from "../protocol/StorageNode";
import type * as DevTools from "../types/DevToolsTreeNode";
import type { ParentToChildNodeMap } from "../types/NodeMap";
import type { ApplyResult, ManagedPool } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import {
  creationOpToLiveNode,
  deserialize,
  liveNodeToLson,
  lsonToLiveNode,
} from "./liveblocks-helpers";
import { LiveRegister } from "./LiveRegister";
import type { LiveNode, Lson } from "./Lson";
import type { ToImmutable } from "./utils";

export type LiveListUpdateDelta =
  | { type: "insert"; index: number; item: Lson }
  | { type: "delete"; index: number; deletedItem: Lson }
  | { type: "move"; index: number; previousIndex: number; item: Lson }
  | { type: "set"; index: number; item: Lson };

/**
 * A LiveList notification that is sent in-client to any subscribers whenever
 * one or more of the items inside the LiveList instance have changed.
 */
export type LiveListUpdates<TItem extends Lson> = {
  type: "LiveList";
  node: LiveList<TItem>;
  updates: LiveListUpdateDelta[];
};

function childNodeLt(a: LiveNode, b: LiveNode): boolean {
  return a._parentPos < b._parentPos;
}

/**
 * The LiveList class represents an ordered collection of items that is synchronized across clients.
 */
export class LiveList<TItem extends Lson> extends AbstractCrdt {
  #items: SortedList<LiveNode>;
  #implicitlyDeletedItems: WeakSet<LiveNode>;
  #unacknowledgedSets: Map<string, string>;

  constructor(items: TItem[]) {
    super();
    this.#implicitlyDeletedItems = new WeakSet();
    this.#unacknowledgedSets = new Map();

    const nodes: LiveNode[] = [];
    let position = undefined;
    for (const item of items) {
      const newPosition = makePosition(position);
      const node = lsonToLiveNode(item);
      node._setParentLink(this, newPosition);
      nodes.push(node);
      position = newPosition;
    }
    this.#items = SortedList.fromAlreadySorted(nodes, childNodeLt);
  }

  /** @internal */
  static _deserialize(
    [id, _]: ListStorageNode,
    parentToChildren: ParentToChildNodeMap,
    pool: ManagedPool
  ): LiveList<Lson> {
    const list = new LiveList([]);
    list._attach(id, pool);

    const children = parentToChildren.get(id);
    if (children === undefined) {
      return list;
    }

    for (const node of children) {
      const crdt = node[1];
      const child = deserialize(node, parentToChildren, pool);

      child._setParentLink(list, crdt.parentKey);
      list.#insert(child);
    }

    return list;
  }

  /**
   * @internal
   * This function assumes that the resulting ops will be sent to the server if they have an 'opId'
   * so we mutate _unacknowledgedSets to avoid potential flickering
   * https://github.com/liveblocks/liveblocks/pull/1177
   *
   * This is quite unintuitive and should disappear as soon as
   * we introduce an explicit LiveList.Set operation
   */
  _toOps(parentId: string, parentKey: string): CreateOp[] {
    if (this._id === undefined) {
      throw new Error("Cannot serialize item is not attached");
    }

    const ops: CreateOp[] = [];
    const op: CreateListOp = {
      id: this._id,
      type: OpCode.CREATE_LIST,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const item of this.#items) {
      const parentKey = item._getParentKeyOrThrow();
      const childOps = HACK_addIntentAndDeletedIdToOperation(
        item._toOps(this._id, parentKey),
        undefined
      );
      ops.push(...childOps);
    }

    return ops;
  }

  /**
   * Inserts a new child into the list in the correct location (binary search
   * finds correct position efficiently).
   */
  #insert(childNode: LiveNode): void {
    this.#items.add(childNode);
    this.invalidate();
  }

  /**
   * Updates an item's position and repositions it in the sorted list.
   * Encapsulates the remove -> mutate -> add cycle needed when changing sort keys.
   *
   * IMPORTANT: Item must exist in this list. List count remains unchanged.
   */
  #updateItemPosition(item: LiveNode, newKey: string): void {
    const wasRemoved = this.#items.remove(item);
    if (!wasRemoved) {
      throw new Error(
        "Cannot update position of item not in list. This is a bug in LiveList."
      );
    }
    item._setParentLink(this, newKey);
    this.#items.add(item);
    this.invalidate();
  }

  /**
   * Updates an item's position by index. Safer than #updateItemPosition when you have
   * an index, as it ensures the item exists and is from this list.
   */
  #updateItemPositionAt(index: number, newKey: string): void {
    const item = nn(this.#items.at(index));
    this.#updateItemPosition(item, newKey);
  }

  /** @internal */
  _indexOfPosition(position: string): number {
    return this.#items.findIndex(
      (item) => item._getParentKeyOrThrow() === position
    );
  }

  /** @internal */
  _attach(id: string, pool: ManagedPool): void {
    super._attach(id, pool);

    for (const item of this.#items) {
      item._attach(pool.generateId(), pool);
    }
  }

  /** @internal */
  _detach(): void {
    super._detach();

    for (const item of this.#items) {
      item._detach();
    }
  }

  #applySetRemote(op: CreateOp): ApplyResult {
    if (this._pool === undefined) {
      throw new Error("Can't attach child if managed pool is not present");
    }

    const { id, parentKey: key } = op;
    const child = creationOpToLiveNode(op);
    child._attach(id, this._pool);
    child._setParentLink(this, key);

    const deletedId = op.deletedId;

    const indexOfItemWithSamePosition = this._indexOfPosition(key);

    // If there is already an item at this position
    if (indexOfItemWithSamePosition !== -1) {
      const itemWithSamePosition = nn(
        this.#items.removeAt(indexOfItemWithSamePosition)
      );

      // No conflict, the item that is being replaced is the same that was deleted on the sender
      if (itemWithSamePosition._id === deletedId) {
        itemWithSamePosition._detach();

        // Replace the existing item with the newly created item
        this.#items.add(child);

        return {
          modified: makeUpdate(this, [
            setDelta(indexOfItemWithSamePosition, child),
          ]),
          reverse: [],
        };
      } else {
        // Item at position to be replaced is different from server, so we
        // remember it in case we need to restore it later.
        // This scenario can happen if an other item has been put at this position
        // while getting the acknowledgement of the set (move, insert or set)
        this.#implicitlyDeletedItems.add(itemWithSamePosition);

        // Replace the existing item with the newly created item without sorting the list
        this.#items.remove(itemWithSamePosition);
        this.#items.add(child);

        const delta: LiveListUpdateDelta[] = [
          setDelta(indexOfItemWithSamePosition, child),
        ];

        // Even if we implicitly delete the item at the set position
        // We still need to delete the item that was orginaly deleted by the set
        const deleteDelta = this.#detachItemAssociatedToSetOperation(
          op.deletedId
        );

        if (deleteDelta) {
          delta.push(deleteDelta);
        }

        return {
          modified: makeUpdate(this, delta),
          reverse: [],
        };
      }
    } else {
      // Item at position to be replaced doesn't exist
      const updates: LiveListUpdateDelta[] = [];
      const deleteDelta = this.#detachItemAssociatedToSetOperation(
        op.deletedId
      );
      if (deleteDelta) {
        updates.push(deleteDelta);
      }

      this.#insert(child);

      updates.push(insertDelta(this._indexOfPosition(key), child));

      return {
        reverse: [],
        modified: makeUpdate(this, updates),
      };
    }
  }

  #applySetAck(op: CreateOp): ApplyResult {
    if (this._pool === undefined) {
      throw new Error("Can't attach child if managed pool is not present");
    }

    const delta: LiveListUpdateDelta[] = [];

    // Deleted item can be re-inserted by remote undo/redo
    const deletedDelta = this.#detachItemAssociatedToSetOperation(op.deletedId);
    if (deletedDelta) {
      delta.push(deletedDelta);
    }

    const unacknowledgedOpId = this.#unacknowledgedSets.get(op.parentKey);

    if (unacknowledgedOpId !== undefined) {
      if (unacknowledgedOpId !== op.opId) {
        return delta.length === 0
          ? { modified: false }
          : { modified: makeUpdate(this, delta), reverse: [] };
      } else {
        this.#unacknowledgedSets.delete(op.parentKey);
      }
    }

    const indexOfItemWithSamePosition = this._indexOfPosition(op.parentKey);

    const existingItem = this.#items.find((item) => item._id === op.id);

    // If item already exists...
    if (existingItem !== undefined) {
      // ...and if it's at the right position
      if (existingItem._parentKey === op.parentKey) {
        // ... do nothing
        return {
          modified: delta.length > 0 ? makeUpdate(this, delta) : false,
          reverse: [],
        };
      }

      // Item exists but not at the right position (local move after set)
      if (indexOfItemWithSamePosition !== -1) {
        const itemAtPosition = nn(
          this.#items.removeAt(indexOfItemWithSamePosition)
        );
        this.#implicitlyDeletedItems.add(itemAtPosition);
        delta.push(deleteDelta(indexOfItemWithSamePosition, itemAtPosition));
      }

      const prevIndex = this.#items.findIndex((item) => item === existingItem);
      this.#updateItemPosition(existingItem, op.parentKey);
      const newIndex = this.#items.findIndex((item) => item === existingItem);
      if (newIndex !== prevIndex) {
        delta.push(moveDelta(prevIndex, newIndex, existingItem));
      }

      return {
        modified: delta.length > 0 ? makeUpdate(this, delta) : false,
        reverse: [],
      };
    } else {
      // Item associated to the set ack does not exist either deleted localy or via remote undo/redo
      const orphan = this._pool.getNode(op.id);
      if (orphan && this.#implicitlyDeletedItems.has(orphan)) {
        // Reattach orphan at the new position
        orphan._setParentLink(this, op.parentKey);
        // And delete it from the orphan cache
        this.#implicitlyDeletedItems.delete(orphan);

        this.#insert(orphan);

        const recreatedItemIndex = this.#items.findIndex(
          (item) => item === orphan
        );

        return {
          modified: makeUpdate(this, [
            // If there is an item at this position, update is a set, else it's an insert
            indexOfItemWithSamePosition === -1
              ? insertDelta(recreatedItemIndex, orphan)
              : setDelta(recreatedItemIndex, orphan),
            ...delta,
          ]),
          reverse: [],
        };
      } else {
        if (indexOfItemWithSamePosition !== -1) {
          nn(this.#items.removeAt(indexOfItemWithSamePosition));
        }

        const { newItem, newIndex } = this.#createAttachItemAndSort(
          op,
          op.parentKey
        );

        return {
          modified: makeUpdate(this, [
            // If there is an item at this position, update is a set, else it's an insert
            indexOfItemWithSamePosition === -1
              ? insertDelta(newIndex, newItem)
              : setDelta(newIndex, newItem),
            ...delta,
          ]),
          reverse: [],
        };
      }
    }
  }

  /**
   * Returns the update delta of the deletion or null
   */
  #detachItemAssociatedToSetOperation(
    deletedId?: string
  ): LiveListUpdateDelta | null {
    if (deletedId === undefined || this._pool === undefined) {
      return null;
    }

    const deletedItem = this._pool.getNode(deletedId);
    if (deletedItem === undefined) {
      return null;
    }

    const result = this._detachChild(deletedItem);
    if (result.modified === false) {
      return null;
    }

    return result.modified.updates[0];
  }

  #applyRemoteInsert(op: CreateOp): ApplyResult {
    if (this._pool === undefined) {
      throw new Error("Can't attach child if managed pool is not present");
    }

    const key = asPos(op.parentKey);

    const existingItemIndex = this._indexOfPosition(key);

    if (existingItemIndex !== -1) {
      // If change is remote => assign a temporary position to existing child until we get the fix from the backend
      this.#shiftItemPosition(existingItemIndex, key);
    }

    const { newItem, newIndex } = this.#createAttachItemAndSort(op, key);

    // TODO: add move update?
    return {
      modified: makeUpdate(this, [insertDelta(newIndex, newItem)]),
      reverse: [],
    };
  }

  #applyInsertAck(op: CreateOp): ApplyResult {
    const existingItem = this.#items.find((item) => item._id === op.id);
    const key = asPos(op.parentKey);

    const itemIndexAtPosition = this._indexOfPosition(key);

    if (existingItem) {
      if (existingItem._parentKey === key) {
        // Normal case, no modification
        return {
          modified: false,
        };
      } else {
        const oldPositionIndex = this.#items.findIndex(
          (item) => item === existingItem
        );
        if (itemIndexAtPosition !== -1) {
          this.#shiftItemPosition(itemIndexAtPosition, key);
        }

        this.#updateItemPosition(existingItem, key);

        const newIndex = this._indexOfPosition(key);

        if (newIndex === oldPositionIndex) {
          return { modified: false };
        }

        return {
          modified: makeUpdate(this, [
            moveDelta(oldPositionIndex, newIndex, existingItem),
          ]),
          reverse: [],
        };
      }
    } else {
      const orphan = nn(this._pool).getNode(op.id);
      if (orphan && this.#implicitlyDeletedItems.has(orphan)) {
        // Implicit delete after set
        orphan._setParentLink(this, key);
        this.#implicitlyDeletedItems.delete(orphan);

        this.#insert(orphan);

        const newIndex = this._indexOfPosition(key);

        return {
          modified: makeUpdate(this, [insertDelta(newIndex, orphan)]),
          reverse: [],
        };
      } else {
        if (itemIndexAtPosition !== -1) {
          this.#shiftItemPosition(itemIndexAtPosition, key);
        }

        const { newItem, newIndex } = this.#createAttachItemAndSort(op, key);

        return {
          modified: makeUpdate(this, [insertDelta(newIndex, newItem)]),
          reverse: [],
        };
      }
    }
  }

  #applyInsertUndoRedo(op: CreateOp): ApplyResult {
    const { id, parentKey: key } = op;
    const child = creationOpToLiveNode(op);

    if (this._pool?.getNode(id) !== undefined) {
      return { modified: false };
    }

    child._attach(id, nn(this._pool));
    child._setParentLink(this, key);

    const existingItemIndex = this._indexOfPosition(key);

    let newKey = key;

    if (existingItemIndex !== -1) {
      const before = this.#items.at(existingItemIndex)?._parentPos;
      const after = this.#items.at(existingItemIndex + 1)?._parentPos;

      newKey = makePosition(before, after);
      child._setParentLink(this, newKey);
    }

    this.#insert(child);

    const newIndex = this._indexOfPosition(newKey);

    return {
      modified: makeUpdate(this, [insertDelta(newIndex, child)]),
      reverse: [{ type: OpCode.DELETE_CRDT, id }],
    };
  }

  #applySetUndoRedo(op: CreateOp): ApplyResult {
    const { id, parentKey: key } = op;
    const child = creationOpToLiveNode(op);

    if (this._pool?.getNode(id) !== undefined) {
      return { modified: false };
    }

    this.#unacknowledgedSets.set(key, nn(op.opId));

    const indexOfItemWithSameKey = this._indexOfPosition(key);

    child._attach(id, nn(this._pool));
    child._setParentLink(this, key);

    const newKey = key;

    // If there is already an item at this position
    if (indexOfItemWithSameKey !== -1) {
      // TODO: Should we add this item to implictly deleted item?
      const existingItem = this.#items.at(indexOfItemWithSameKey)!;
      existingItem._detach();

      this.#items.remove(existingItem);
      this.#items.add(child);

      const reverse = HACK_addIntentAndDeletedIdToOperation(
        existingItem._toOps(nn(this._id), key),
        op.id
      );

      const delta = [setDelta(indexOfItemWithSameKey, child)];
      const deletedDelta = this.#detachItemAssociatedToSetOperation(
        op.deletedId
      );
      if (deletedDelta) {
        delta.push(deletedDelta);
      }

      return {
        modified: makeUpdate(this, delta),
        reverse,
      };
    } else {
      this.#insert(child);

      // TODO: Use delta
      this.#detachItemAssociatedToSetOperation(op.deletedId);

      const newIndex = this._indexOfPosition(newKey);

      return {
        reverse: [{ type: OpCode.DELETE_CRDT, id }],
        modified: makeUpdate(this, [insertDelta(newIndex, child)]),
      };
    }
  }

  /** @internal */
  _attachChild(op: CreateOp, source: OpSource): ApplyResult {
    if (this._pool === undefined) {
      throw new Error("Can't attach child if managed pool is not present");
    }

    let result: ApplyResult;

    if (op.intent === "set") {
      if (source === OpSource.THEIRS) {
        result = this.#applySetRemote(op);
      } else if (source === OpSource.OURS) {
        result = this.#applySetAck(op);
      } else {
        result = this.#applySetUndoRedo(op);
      }
    } else {
      if (source === OpSource.THEIRS) {
        result = this.#applyRemoteInsert(op);
      } else if (source === OpSource.OURS) {
        result = this.#applyInsertAck(op);
      } else {
        result = this.#applyInsertUndoRedo(op);
      }
    }

    if (result.modified !== false) {
      this.invalidate();
    }

    return result;
  }

  /** @internal */
  _detachChild(
    child: LiveNode
  ): { reverse: Op[]; modified: LiveListUpdates<TItem> } | { modified: false } {
    if (child) {
      const parentKey = nn(child._parentKey);
      const reverse = child._toOps(nn(this._id), parentKey);

      const indexToDelete = this.#items.findIndex((item) => item === child);

      if (indexToDelete === -1) {
        return {
          modified: false,
        };
      }

      const previousNode = this.#items.at(indexToDelete)!;
      this.#items.remove(child);
      this.invalidate();

      child._detach();

      return {
        modified: makeUpdate(this, [deleteDelta(indexToDelete, previousNode)]),
        reverse,
      };
    }

    return { modified: false };
  }

  #applySetChildKeyRemote(newKey: Pos, child: LiveNode): ApplyResult {
    if (this.#implicitlyDeletedItems.has(child)) {
      this.#implicitlyDeletedItems.delete(child);

      child._setParentLink(this, newKey);
      this.#insert(child);

      const newIndex = this.#items.findIndex((item) => item === child);

      // TODO: Shift existing item?

      return {
        modified: makeUpdate(this, [insertDelta(newIndex, child)]),
        reverse: [],
      };
    }

    const previousKey = child._parentKey;

    if (newKey === previousKey) {
      return {
        modified: false,
      };
    }

    // TODO: should we look at orphan
    const existingItemIndex = this._indexOfPosition(newKey);

    // Normal case
    if (existingItemIndex === -1) {
      const previousIndex = this.#items.findIndex((item) => item === child);
      this.#updateItemPosition(child, newKey);
      const newIndex = this.#items.findIndex((item) => item === child);

      if (newIndex === previousIndex) {
        return {
          modified: false,
        };
      }

      return {
        modified: makeUpdate(this, [moveDelta(previousIndex, newIndex, child)]),
        reverse: [],
      };
    } else {
      this.#updateItemPositionAt(
        existingItemIndex,
        makePosition(newKey, this.#items.at(existingItemIndex + 1)?._parentPos)
      );

      const previousIndex = this.#items.findIndex((item) => item === child);
      this.#updateItemPosition(child, newKey);
      const newIndex = this.#items.findIndex((item) => item === child);

      if (newIndex === previousIndex) {
        return {
          modified: false,
        };
      }

      return {
        modified: makeUpdate(this, [moveDelta(previousIndex, newIndex, child)]),
        reverse: [],
      };
    }
  }

  #applySetChildKeyAck(newKey: Pos, child: LiveNode): ApplyResult {
    const previousKey = nn(child._parentKey);

    if (this.#implicitlyDeletedItems.has(child)) {
      const existingItemIndex = this._indexOfPosition(newKey);

      this.#implicitlyDeletedItems.delete(child);

      if (existingItemIndex !== -1) {
        const existingItem = this.#items.at(existingItemIndex)!;
        existingItem._setParentLink(
          this,
          makePosition(
            newKey,
            this.#items.at(existingItemIndex + 1)?._parentPos
          )
        );
      }

      child._setParentLink(this, newKey);
      this.#insert(child);

      const newIndex = this.#items.findIndex((item) => item === child);
      return {
        modified: makeUpdate(this, [insertDelta(newIndex, child)]),
        reverse: [],
      };
    } else {
      if (newKey === previousKey) {
        return {
          modified: false,
        };
      }

      // At this point, it means that the item has been moved before receiving the ack
      // so we replace it at the right position

      const previousIndex = this.#items.findIndex((item) => item === child);

      const existingItemIndex = this._indexOfPosition(newKey);

      if (existingItemIndex !== -1) {
        this.#updateItemPositionAt(
          existingItemIndex,
          makePosition(
            newKey,
            this.#items.at(existingItemIndex + 1)?._parentPos
          )
        );
      }

      this.#updateItemPosition(child, newKey);

      const newIndex = this.#items.findIndex((item) => item === child);

      if (previousIndex === newIndex) {
        // parentKey changed but final position in the list didn't
        return {
          modified: false,
        };
      } else {
        return {
          modified: makeUpdate(this, [
            moveDelta(previousIndex, newIndex, child),
          ]),
          reverse: [],
        };
      }
    }
  }

  #applySetChildKeyUndoRedo(newKey: Pos, child: LiveNode): ApplyResult {
    const previousKey = nn(child._parentKey);

    const previousIndex = this.#items.findIndex((item) => item === child);
    const existingItemIndex = this._indexOfPosition(newKey);

    // If position is occupied, find a free position for item being moved
    let actualNewKey = newKey;
    if (existingItemIndex !== -1) {
      // Find a free position near the desired position
      actualNewKey = makePosition(
        newKey,
        this.#items.at(existingItemIndex + 1)?._parentPos
      );
    }

    this.#updateItemPosition(child, actualNewKey);

    const newIndex = this.#items.findIndex((item) => item === child);

    if (previousIndex === newIndex) {
      return {
        modified: false,
      };
    }

    return {
      modified: makeUpdate(this, [moveDelta(previousIndex, newIndex, child)]),
      reverse: [
        {
          type: OpCode.SET_PARENT_KEY,
          id: nn(child._id),
          parentKey: previousKey,
        },
      ],
    };
  }

  /** @internal */
  _setChildKey(newKey: Pos, child: LiveNode, source: OpSource): ApplyResult {
    if (source === OpSource.THEIRS) {
      return this.#applySetChildKeyRemote(newKey, child);
    } else if (source === OpSource.OURS) {
      return this.#applySetChildKeyAck(newKey, child);
    } else {
      return this.#applySetChildKeyUndoRedo(newKey, child);
    }
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }

  /** @internal */
  _serialize(): SerializedList {
    if (this.parent.type !== "HasParent") {
      throw new Error("Cannot serialize LiveList if parent is missing");
    }

    return {
      type: CrdtType.LIST,
      parentId: nn(this.parent.node._id, "Parent node expected to have ID"),
      parentKey: this.parent.key,
    };
  }

  /**
   * Returns the number of elements.
   */
  get length(): number {
    return this.#items.length;
  }

  /**
   * Adds one element to the end of the LiveList.
   * @param element The element to add to the end of the LiveList.
   */
  push(element: TItem): void {
    this._pool?.assertStorageIsWritable();
    return this.insert(element, this.length);
  }

  /**
   * Inserts one element at a specified index.
   * @param element The element to insert.
   * @param index The index at which you want to insert the element.
   */
  insert(element: TItem, index: number): void {
    this._pool?.assertStorageIsWritable();
    if (index < 0 || index > this.#items.length) {
      throw new Error(
        `Cannot insert list item at index "${index}". index should be between 0 and ${this.#items.length}`
      );
    }

    const before = this.#items.at(index - 1)?._parentPos;
    const after = this.#items.at(index)?._parentPos;

    const position = makePosition(before, after);

    const value = lsonToLiveNode(element);
    value._setParentLink(this, position);

    this.#insert(value);

    if (this._pool && this._id) {
      const id = this._pool.generateId();
      value._attach(id, this._pool);

      this._pool.dispatch(
        value._toOpsWithOpId(this._id, position, this._pool),
        [{ type: OpCode.DELETE_CRDT, id }],
        new Map<string, LiveListUpdates<TItem>>([
          [this._id, makeUpdate(this, [insertDelta(index, value)])],
        ])
      );
    }
  }

  /**
   * Move one element from one index to another.
   * @param index The index of the element to move
   * @param targetIndex The index where the element should be after moving.
   */
  move(index: number, targetIndex: number): void {
    this._pool?.assertStorageIsWritable();
    if (targetIndex < 0) {
      throw new Error("targetIndex cannot be less than 0");
    }

    if (targetIndex >= this.#items.length) {
      throw new Error(
        "targetIndex cannot be greater or equal than the list length"
      );
    }

    if (index < 0) {
      throw new Error("index cannot be less than 0");
    }

    if (index >= this.#items.length) {
      throw new Error("index cannot be greater or equal than the list length");
    }

    let beforePosition = null;
    let afterPosition = null;

    if (index < targetIndex) {
      afterPosition =
        targetIndex === this.#items.length - 1
          ? undefined
          : this.#items.at(targetIndex + 1)?._parentPos;
      beforePosition = this.#items.at(targetIndex)!._parentPos;
    } else {
      afterPosition = this.#items.at(targetIndex)!._parentPos;
      beforePosition =
        targetIndex === 0
          ? undefined
          : this.#items.at(targetIndex - 1)?._parentPos;
    }

    const position = makePosition(beforePosition, afterPosition);

    const item = this.#items.at(index)!;
    const previousPosition = item._getParentKeyOrThrow();
    this.#updateItemPositionAt(index, position);

    if (this._pool && this._id) {
      const storageUpdates = new Map<string, LiveListUpdates<TItem>>([
        [this._id, makeUpdate(this, [moveDelta(index, targetIndex, item)])],
      ]);

      this._pool.dispatch(
        [
          {
            type: OpCode.SET_PARENT_KEY,
            id: nn(item._id),
            opId: this._pool.generateOpId(),
            parentKey: position,
          },
        ],
        [
          {
            type: OpCode.SET_PARENT_KEY,
            id: nn(item._id),
            parentKey: previousPosition,
          },
        ],
        storageUpdates
      );
    }
  }

  /**
   * Deletes an element at the specified index
   * @param index The index of the element to delete
   */
  delete(index: number): void {
    this._pool?.assertStorageIsWritable();
    if (index < 0 || index >= this.#items.length) {
      throw new Error(
        `Cannot delete list item at index "${index}". index should be between 0 and ${
          this.#items.length - 1
        }`
      );
    }

    const item = this.#items.at(index)!;
    item._detach();
    this.#items.remove(item);
    this.invalidate();

    if (this._pool) {
      const childRecordId = item._id;
      if (childRecordId) {
        const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
        storageUpdates.set(
          nn(this._id),
          makeUpdate(this, [deleteDelta(index, item)])
        );

        this._pool.dispatch(
          [
            {
              id: childRecordId,
              opId: this._pool.generateOpId(),
              type: OpCode.DELETE_CRDT,
            },
          ],
          item._toOps(nn(this._id), item._getParentKeyOrThrow()),
          storageUpdates
        );
      }
    }
  }

  clear(): void {
    this._pool?.assertStorageIsWritable();
    if (this._pool) {
      const ops: ClientWireOp[] = [];
      const reverseOps: Op[] = [];

      const updateDelta: LiveListUpdateDelta[] = [];

      for (const item of this.#items) {
        item._detach();
        const childId = item._id;
        if (childId) {
          ops.push({
            type: OpCode.DELETE_CRDT,
            id: childId,
            opId: this._pool.generateOpId(),
          });
          reverseOps.push(
            ...item._toOps(nn(this._id), item._getParentKeyOrThrow())
          );

          // Index is always 0 because updates are applied one after another
          // when applied on an immutable state
          updateDelta.push(deleteDelta(0, item));
        }
      }

      this.#items.clear();
      this.invalidate();

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(nn(this._id), makeUpdate(this, updateDelta));

      this._pool.dispatch(ops, reverseOps, storageUpdates);
    } else {
      for (const item of this.#items) {
        item._detach();
      }
      this.#items.clear();
      this.invalidate();
    }
  }

  set(index: number, item: TItem): void {
    this._pool?.assertStorageIsWritable();
    if (index < 0 || index >= this.#items.length) {
      throw new Error(
        `Cannot set list item at index "${index}". index should be between 0 and ${
          this.#items.length - 1
        }`
      );
    }

    const existingItem = this.#items.at(index)!;
    const position = existingItem._getParentKeyOrThrow();

    const existingId = existingItem._id;
    existingItem._detach();

    const value = lsonToLiveNode(item);
    value._setParentLink(this, position);
    this.#items.remove(existingItem);
    this.#items.add(value);
    this.invalidate();

    if (this._pool && this._id) {
      const id = this._pool.generateId();
      value._attach(id, this._pool);

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id, makeUpdate(this, [setDelta(index, value)]));

      const ops = HACK_addIntentAndDeletedIdToOperation(
        value._toOpsWithOpId(this._id, position, this._pool),
        existingId
      );
      this.#unacknowledgedSets.set(position, nn(ops[0].opId));
      const reverseOps = HACK_addIntentAndDeletedIdToOperation(
        existingItem._toOps(this._id, position),
        id
      );

      this._pool.dispatch(ops, reverseOps, storageUpdates);
    }
  }

  /**
   * Returns an Array of all the elements in the LiveList.
   */
  toArray(): TItem[] {
    return Array.from(this.#items, (entry) => liveNodeToLson(entry) as TItem);
    //                                                                ^^^^^^^^
    //                                                                FIXME! This isn't safe.
  }

  /**
   * Tests whether all elements pass the test implemented by the provided function.
   * @param predicate Function to test for each element, taking two arguments (the element and its index).
   * @returns true if the predicate function returns a truthy value for every element. Otherwise, false.
   */
  every(predicate: (value: TItem, index: number) => unknown): boolean {
    return this.toArray().every(predicate);
  }

  /**
   * Creates an array with all elements that pass the test implemented by the provided function.
   * @param predicate Function to test each element of the LiveList. Return a value that coerces to true to keep the element, or to false otherwise.
   * @returns An array with the elements that pass the test.
   */
  filter(predicate: (value: TItem, index: number) => unknown): TItem[] {
    return this.toArray().filter(predicate);
  }

  /**
   * Returns the first element that satisfies the provided testing function.
   * @param predicate Function to execute on each value.
   * @returns The value of the first element in the LiveList that satisfies the provided testing function. Otherwise, undefined is returned.
   */
  find(predicate: (value: TItem, index: number) => unknown): TItem | undefined {
    return this.toArray().find(predicate);
  }

  /**
   * Returns the index of the first element in the LiveList that satisfies the provided testing function.
   * @param predicate Function to execute on each value until the function returns true, indicating that the satisfying element was found.
   * @returns The index of the first element in the LiveList that passes the test. Otherwise, -1.
   */
  findIndex(predicate: (value: TItem, index: number) => unknown): number {
    return this.toArray().findIndex(predicate);
  }

  /**
   * Executes a provided function once for each element.
   * @param callbackfn Function to execute on each element.
   */
  forEach(callbackfn: (value: TItem, index: number) => void): void {
    return this.toArray().forEach(callbackfn);
  }

  /**
   * Get the element at the specified index.
   * @param index The index on the element to get.
   * @returns The element at the specified index or undefined.
   */
  get(index: number): TItem | undefined {
    if (index < 0 || index >= this.#items.length) {
      return undefined;
    }

    const item = this.#items.at(index);
    return item ? (liveNodeToLson(item) as TItem | undefined) : undefined;
    //                                     ^^^^^^^^^^^^^^^^^
    //                                     FIXME! This isn't safe.
  }

  /**
   * Returns the first index at which a given element can be found in the LiveList, or -1 if it is not present.
   * @param searchElement Element to locate.
   * @param fromIndex The index to start the search at.
   * @returns The first index of the element in the LiveList; -1 if not found.
   */
  indexOf(searchElement: TItem, fromIndex?: number): number {
    return this.toArray().indexOf(searchElement, fromIndex);
  }

  /**
   * Returns the last index at which a given element can be found in the LiveList, or -1 if it is not present. The LiveLsit is searched backwards, starting at fromIndex.
   * @param searchElement Element to locate.
   * @param fromIndex The index at which to start searching backwards.
   * @returns
   */
  lastIndexOf(searchElement: TItem, fromIndex?: number): number {
    return this.toArray().lastIndexOf(searchElement, fromIndex);
  }

  /**
   * Creates an array populated with the results of calling a provided function on every element.
   * @param callback Function that is called for every element.
   * @returns An array with each element being the result of the callback function.
   */
  map<U>(callback: (value: TItem, index: number) => U): U[] {
    const result: U[] = [];
    let i = 0;
    for (const entry of this.#items) {
      result.push(
        callback(
          liveNodeToLson(entry) as TItem,
          //                    ^^^^^^^^
          //                    FIXME! This isn't safe.
          i
        )
      );
      i++;
    }
    return result;
  }

  /**
   * Tests whether at least one element in the LiveList passes the test implemented by the provided function.
   * @param predicate Function to test for each element.
   * @returns true if the callback function returns a truthy value for at least one element. Otherwise, false.
   */
  some(predicate: (value: TItem, index: number) => unknown): boolean {
    return this.toArray().some(predicate);
  }

  [Symbol.iterator](): IterableIterator<TItem> {
    return new LiveListIterator(this.#items);
  }

  #createAttachItemAndSort(
    op: CreateOp,
    key: string
  ): {
    newItem: LiveNode;
    newIndex: number;
  } {
    const newItem = creationOpToLiveNode(op);

    newItem._attach(op.id, nn(this._pool));
    newItem._setParentLink(this, key);

    this.#insert(newItem);

    const newIndex = this._indexOfPosition(key);

    return { newItem, newIndex };
  }

  #shiftItemPosition(index: number, key: Pos) {
    const shiftedPosition = makePosition(
      key,
      this.#items.length > index + 1
        ? this.#items.at(index + 1)?._parentPos
        : undefined
    );

    this.#updateItemPositionAt(index, shiftedPosition);
  }

  /** @internal */
  _toTreeNode(key: string): DevTools.LsonTreeNode {
    const payload: DevTools.LsonTreeNode[] = [];
    let index = 0;
    for (const item of this.#items) {
      payload.push(item.toTreeNode(index.toString()));
      index++;
    }
    return {
      type: "LiveList",
      id: this._id ?? nanoid(),
      key,
      payload,
    };
  }

  toImmutable(): readonly ToImmutable<TItem>[] {
    // Don't implement actual toJson logic in here. Implement it in ._toImmutable()
    // instead. This helper merely exists to help TypeScript infer better
    // return types.
    return super.toImmutable() as readonly ToImmutable<TItem>[];
  }

  /** @internal */
  _toImmutable(): readonly ToImmutable<TItem>[] {
    const result = Array.from(this.#items, (node) => node.toImmutable());
    return (
      process.env.NODE_ENV === "production" ? result : Object.freeze(result)
    ) as readonly ToImmutable<TItem>[];
  }

  clone(): LiveList<TItem> {
    return new LiveList(
      Array.from(this.#items, (item) => item.clone() as TItem)
    );
  }
}

class LiveListIterator<T extends Lson> implements IterableIterator<T> {
  #innerIterator: IterableIterator<LiveNode>;

  constructor(items: SortedList<LiveNode>) {
    this.#innerIterator = items[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this;
  }

  next(): IteratorResult<T> {
    const result = this.#innerIterator.next();

    if (result.done) {
      return {
        done: true,
        value: undefined,
      };
    }

    const value = liveNodeToLson(result.value) as T;
    //                                         ^^^^
    //                                         FIXME! This isn't safe.
    return { value };
  }
}

function makeUpdate<TItem extends Lson>(
  liveList: LiveList<TItem>,
  deltaUpdates: LiveListUpdateDelta[]
): LiveListUpdates<TItem> {
  return {
    node: liveList,
    type: "LiveList",
    updates: deltaUpdates,
  };
}

function setDelta(index: number, item: LiveNode): LiveListUpdateDelta {
  return {
    index,
    type: "set",
    item: item instanceof LiveRegister ? item.data : item,
  };
}

function deleteDelta(
  index: number,
  deletedNode: LiveNode
): LiveListUpdateDelta {
  return {
    type: "delete",
    index,
    deletedItem:
      deletedNode instanceof LiveRegister ? deletedNode.data : deletedNode,
  };
}

function insertDelta(index: number, item: LiveNode): LiveListUpdateDelta {
  return {
    index,
    type: "insert",
    item: item instanceof LiveRegister ? item.data : item,
  };
}

function moveDelta(
  previousIndex: number,
  index: number,
  item: LiveNode
): LiveListUpdateDelta {
  return {
    type: "move",
    index,
    item: item instanceof LiveRegister ? item.data : item,
    previousIndex,
  };
}

/**
 * This function is only temporary.
 * As soon as we refactor the operations structure,
 * serializing a LiveStructure should not know anything about intent
 */
function HACK_addIntentAndDeletedIdToOperation<T extends CreateOp>(
  ops: T[],
  deletedId: string | undefined
): T[] {
  return ops.map((op, index) => {
    if (index === 0) {
      // NOTE: Only patch the first Op here
      const firstOp = op;
      return {
        ...firstOp,
        intent: "set",
        deletedId,
      };
    } else {
      return op;
    }
  });
}
