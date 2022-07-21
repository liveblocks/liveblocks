import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import { nn } from "./assert";
import { LiveRegister } from "./LiveRegister";
import { comparePosition, makePosition } from "./position";
import type {
  CreateChildOp,
  CreateListOp,
  CreateOp,
  IdTuple,
  LiveListUpdateDelta,
  LiveListUpdates,
  LiveNode,
  Lson,
  Op,
  ParentToChildNodeMap,
  SerializedList,
} from "./types";
import { CrdtType, OpCode } from "./types";
import {
  creationOpToLiveNode,
  deserialize,
  liveNodeToLson,
  lsonToLiveNode,
} from "./utils";

function compareNodePosition(itemA: LiveNode, itemB: LiveNode) {
  return comparePosition(
    itemA._getParentKeyOrThrow(),
    itemB._getParentKeyOrThrow()
  );
}

/**
 * The LiveList class represents an ordered collection of items that is synchronized across clients.
 */
export class LiveList<TItem extends Lson> extends AbstractCrdt {
  // TODO: Naive array at first, find a better data structure. Maybe an Order statistics tree?
  /** @internal */
  private _items: LiveNode[];

  /** @internal */
  private _implicitlyDeletedItems: Set<LiveNode>;

  /** @internal */
  private _unacknowledgedSets: Map<string, string>;

  constructor(items: TItem[] = []) {
    super();
    this._items = [];
    this._implicitlyDeletedItems = new Set();
    this._unacknowledgedSets = new Map();

    let position = undefined;
    for (let i = 0; i < items.length; i++) {
      const newPosition = makePosition(position);
      const item = lsonToLiveNode(items[i]);
      item._setParentLink(this, newPosition);
      this._items.push(item);
      position = newPosition;
    }
  }

  /** @internal */
  static _deserialize(
    [id]: IdTuple<SerializedList>,
    parentToChildren: ParentToChildNodeMap,
    doc: Doc
  ): LiveList<Lson> {
    const list = new LiveList();
    list._attach(id, doc);

    const children = parentToChildren.get(id);

    if (children == null) {
      return list;
    }

    for (const [id, crdt] of children) {
      const child = deserialize([id, crdt], parentToChildren, doc);

      child._setParentLink(list, crdt.parentKey);
      list._insertAndSort(child);
    }

    return list;
  }

  /** @internal */
  _serialize(parentId: string, parentKey: string, doc?: Doc): CreateChildOp[] {
    if (this._id == null) {
      throw new Error("Cannot serialize item is not attached");
    }

    const ops: CreateChildOp[] = [];
    const op: CreateListOp = {
      id: this._id,
      opId: doc?.generateOpId(),
      type: OpCode.CREATE_LIST,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const item of this._items) {
      ops.push(...item._serialize(this._id, item._getParentKeyOrThrow(), doc));
    }

    return ops;
  }

  /**
   * @internal
   *
   * Adds a new item into the sorted list, in the correct position.
   */
  _insertAndSort(item: LiveNode): void {
    this._items.push(item);
    this._sortItems();
  }

  /** @internal */
  _sortItems(): void {
    this._items.sort(compareNodePosition);
  }

  /** @internal */
  _indexOfPosition(position: string): number {
    return this._items.findIndex(
      (item) => item._getParentKeyOrThrow() === position
    );
  }

  /** @internal */
  _attach(id: string, doc: Doc): void {
    super._attach(id, doc);

    for (const item of this._items) {
      item._attach(doc.generateId(), doc);
    }
  }

  /** @internal */
  _detach(): void {
    super._detach();

    for (const item of this._items) {
      item._detach();
    }
  }

  /** @internal */
  private _applySetRemote(op: CreateChildOp): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const { id, parentKey: key } = op;
    const child = creationOpToLiveNode(op);
    child._attach(id, this._doc);
    child._setParentLink(this, key);

    const deletedId = op.deletedId;

    const indexOfItemWithSamePosition = this._indexOfPosition(key);

    // If there is already an item at this position
    if (indexOfItemWithSamePosition !== -1) {
      const itemWithSamePosition = this._items[indexOfItemWithSamePosition];

      // No conflict, the item that is being replaced is the same that was deleted on the sender
      if (itemWithSamePosition._id === deletedId) {
        itemWithSamePosition._detach();

        // Replace the existing item with the newly created item without sorting the list
        this._items[indexOfItemWithSamePosition] = child;

        return {
          modified: makeUpdate(this, [
            setDelta(indexOfItemWithSamePosition, child),
          ]),
          reverse: [],
        };
      } else {
        // item at position to be replaced is different from server, so we put in a cache
        // This scenario can happen if an other item has been put at this position
        // while getting the acknowledgement of the set (move, insert or set)
        this._implicitlyDeletedItems.add(itemWithSamePosition);

        // Replace the existing item with the newly created item without sorting the list
        this._items[indexOfItemWithSamePosition] = child;

        const delta: LiveListUpdateDelta[] = [
          setDelta(indexOfItemWithSamePosition, child),
        ];

        // Even if we implicitly delete the item at the set position
        // We still need to delete the item that was orginaly deleted by the set
        const deleteDelta = this._detachItemAssociatedToSetOperation(
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
      const deleteDelta = this._detachItemAssociatedToSetOperation(
        op.deletedId
      );
      if (deleteDelta) {
        updates.push(deleteDelta);
      }

      this._insertAndSort(child);

      updates.push(insertDelta(this._indexOfPosition(key), child));

      return {
        reverse: [],
        modified: makeUpdate(this, updates),
      };
    }
  }

  /** @internal */
  private _applySetAck(op: CreateChildOp): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const delta: LiveListUpdateDelta[] = [];

    // Deleted item can be re-inserted by remote undo/redo
    const deletedDelta = this._detachItemAssociatedToSetOperation(op.deletedId);
    if (deletedDelta) {
      delta.push(deletedDelta);
    }

    const unacknowledgedOpId = this._unacknowledgedSets.get(op.parentKey);

    if (unacknowledgedOpId != null) {
      if (unacknowledgedOpId !== op.opId) {
        return delta.length === 0
          ? { modified: false }
          : { modified: makeUpdate(this, delta), reverse: [] };
      } else {
        this._unacknowledgedSets.delete(op.parentKey);
      }
    }

    const indexOfItemWithSamePosition = this._indexOfPosition(op.parentKey);

    const existingItem = this._items.find((item) => item._id === op.id);

    // If item already exists...
    if (existingItem != null) {
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
        this._implicitlyDeletedItems.add(
          this._items[indexOfItemWithSamePosition]
        );
        this._items.splice(indexOfItemWithSamePosition, 1);
        delta.push(deleteDelta(indexOfItemWithSamePosition));
      }

      const previousIndex = this._items.indexOf(existingItem);

      existingItem._setParentLink(this, op.parentKey);
      this._sortItems();

      const newIndex = this._items.indexOf(existingItem);

      if (newIndex !== previousIndex) {
        delta.push(moveDelta(previousIndex, newIndex, existingItem));
      }

      return {
        modified: delta.length > 0 ? makeUpdate(this, delta) : false,
        reverse: [],
      };
    } else {
      // Item associated to the set ack does not exist either deleted localy or via remote undo/redo
      const orphan = this._doc.getItem(op.id);

      if (orphan && this._implicitlyDeletedItems.has(orphan)) {
        // Reattach orphan at the new position
        orphan._setParentLink(this, op.parentKey);
        // And delete it from the orphan cache
        this._implicitlyDeletedItems.delete(orphan);

        this._insertAndSort(orphan);

        const recreatedItemIndex = this._items.indexOf(orphan);

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
          this._items.splice(indexOfItemWithSamePosition, 1);
        }

        const { newItem, newIndex } = this._createAttachItemAndSort(
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
   * @internal
   */
  private _detachItemAssociatedToSetOperation(
    deletedId?: string
  ): LiveListUpdateDelta | null {
    if (deletedId == null || this._doc == null) {
      return null;
    }

    const deletedItem = this._doc.getItem(deletedId);

    if (deletedItem == null) {
      return null;
    }

    const result = this._detachChild(deletedItem);

    if (result.modified === false) {
      return null;
    }

    return result.modified.updates[0];
  }

  /** @internal */
  private _applyRemoteInsert(op: CreateChildOp): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const key = op.parentKey;

    const existingItemIndex = this._indexOfPosition(key);

    if (existingItemIndex !== -1) {
      // If change is remote => assign a temporary position to existing child until we get the fix from the backend
      this._shiftItemPosition(existingItemIndex, key);
    }

    const { newItem, newIndex } = this._createAttachItemAndSort(op, key);

    // TODO: add move udpate?
    return {
      modified: makeUpdate(this, [insertDelta(newIndex, newItem)]),
      reverse: [],
    };
  }

  /** @internal */
  private _applyInsertAck(op: CreateChildOp): ApplyResult {
    const existingItem = this._items.find((item) => item._id === op.id);
    const key = op.parentKey;

    const itemIndexAtPosition = this._indexOfPosition(key);

    if (existingItem) {
      if (existingItem._parentKey === key) {
        // Normal case, no modification
        return {
          modified: false,
        };
      } else {
        const oldPositionIndex = this._items.indexOf(existingItem);
        if (itemIndexAtPosition !== -1) {
          this._shiftItemPosition(itemIndexAtPosition, key);
        }

        existingItem._setParentLink(this, key);
        this._sortItems();

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
      const orphan = nn(this._doc).getItem(op.id);

      if (orphan && this._implicitlyDeletedItems.has(orphan)) {
        // Implicit delete after set
        orphan._setParentLink(this, key);
        this._implicitlyDeletedItems.delete(orphan);

        this._insertAndSort(orphan);

        const newIndex = this._indexOfPosition(key);

        return {
          modified: makeUpdate(this, [insertDelta(newIndex, orphan)]),
          reverse: [],
        };
      } else {
        if (itemIndexAtPosition !== -1) {
          this._shiftItemPosition(itemIndexAtPosition, key);
        }

        const { newItem, newIndex } = this._createAttachItemAndSort(op, key);

        return {
          modified: makeUpdate(this, [insertDelta(newIndex, newItem)]),
          reverse: [],
        };
      }
    }
  }

  /** @internal */
  private _applyInsertUndoRedo(op: CreateChildOp): ApplyResult {
    const { id, parentKey: key } = op;
    const child = creationOpToLiveNode(op);

    if (this._doc?.getItem(id) !== undefined) {
      return { modified: false };
    }

    child._attach(id, nn(this._doc));
    child._setParentLink(this, key);

    const existingItemIndex = this._indexOfPosition(key);

    let newKey = key;

    if (existingItemIndex !== -1) {
      const before = this._items[existingItemIndex]
        ? this._items[existingItemIndex]._getParentKeyOrThrow()
        : undefined;
      const after = this._items[existingItemIndex + 1]
        ? this._items[existingItemIndex + 1]._getParentKeyOrThrow()
        : undefined;

      newKey = makePosition(before, after);
      child._setParentLink(this, newKey);
    }

    this._insertAndSort(child);

    const newIndex = this._indexOfPosition(newKey);

    return {
      modified: makeUpdate(this, [insertDelta(newIndex, child)]),
      reverse: [{ type: OpCode.DELETE_CRDT, id }],
    };
  }

  /** @internal */
  private _applySetUndoRedo(op: CreateChildOp): ApplyResult {
    const { id, parentKey: key } = op;
    const child = creationOpToLiveNode(op);

    if (this._doc?.getItem(id) !== undefined) {
      return { modified: false };
    }

    this._unacknowledgedSets.set(key, nn(op.opId));

    const indexOfItemWithSameKey = this._indexOfPosition(key);

    child._attach(id, nn(this._doc));
    child._setParentLink(this, key);

    const newKey = key;

    // If there is already an item at this position
    if (indexOfItemWithSameKey !== -1) {
      // TODO: Should we add this item to implictly deleted item?
      const existingItem = this._items[indexOfItemWithSameKey];
      existingItem._detach();

      this._items[indexOfItemWithSameKey] = child;

      const reverse = existingItem._serialize(nn(this._id), key, this._doc);
      addIntentAndDeletedIdToOperation(reverse, op.id);

      const delta = [setDelta(indexOfItemWithSameKey, child)];
      const deletedDelta = this._detachItemAssociatedToSetOperation(
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
      this._insertAndSort(child);

      // TODO: Use delta
      this._detachItemAssociatedToSetOperation(op.deletedId);

      const newIndex = this._indexOfPosition(newKey);

      return {
        reverse: [{ type: OpCode.DELETE_CRDT, id }],
        modified: makeUpdate(this, [insertDelta(newIndex, child)]),
      };
    }
  }

  /** @internal */
  _attachChild(op: CreateChildOp, source: OpSource): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    if (op.intent === "set") {
      if (source === OpSource.REMOTE) {
        return this._applySetRemote(op);
      }

      if (source === OpSource.UNDOREDO_RECONNECT) {
        return this._applySetUndoRedo(op);
      }

      if (source === OpSource.ACK) {
        return this._applySetAck(op);
      }
    }

    // Insert
    if (source === OpSource.REMOTE) {
      return this._applyRemoteInsert(op);
    } else if (source === OpSource.ACK) {
      return this._applyInsertAck(op);
    } else {
      return this._applyInsertUndoRedo(op);
    }
  }

  /** @internal */
  _detachChild(
    child: LiveNode
  ): { reverse: Op[]; modified: LiveListUpdates<TItem> } | { modified: false } {
    if (child) {
      const parentKey = nn(child._parentKey);
      const reverse = child._serialize(nn(this._id), parentKey, this._doc);

      const indexToDelete = this._items.indexOf(child);

      if (indexToDelete === -1) {
        return {
          modified: false,
        };
      }

      this._items.splice(indexToDelete, 1);

      child._detach();

      return {
        modified: makeUpdate(this, [deleteDelta(indexToDelete)]),
        reverse,
      };
    }

    return { modified: false };
  }

  /** @internal */
  private _applySetChildKeyRemote(
    newKey: string,
    child: LiveNode
  ): ApplyResult {
    if (this._implicitlyDeletedItems.has(child)) {
      this._implicitlyDeletedItems.delete(child);

      child._setParentLink(this, newKey);
      this._insertAndSort(child);

      const newIndex = this._items.indexOf(child);

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
      const previousIndex = this._items.indexOf(child);
      child._setParentLink(this, newKey);
      this._sortItems();
      const newIndex = this._items.indexOf(child);

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
      this._items[existingItemIndex]._setParentLink(
        this,
        makePosition(
          newKey,
          this._items[existingItemIndex + 1]?._getParentKeyOrThrow()
        )
      );

      const previousIndex = this._items.indexOf(child);
      child._setParentLink(this, newKey);
      this._sortItems();
      const newIndex = this._items.indexOf(child);

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

  /** @internal */
  private _applySetChildKeyAck(newKey: string, child: LiveNode): ApplyResult {
    const previousKey = nn(child._parentKey);

    if (this._implicitlyDeletedItems.has(child)) {
      const existingItemIndex = this._indexOfPosition(newKey);

      this._implicitlyDeletedItems.delete(child);

      if (existingItemIndex !== -1) {
        this._items[existingItemIndex]._setParentLink(
          this,
          makePosition(
            newKey,
            this._items[existingItemIndex + 1]?._getParentKeyOrThrow()
          )
        );
      }

      child._setParentLink(this, newKey);
      this._insertAndSort(child);

      // TODO
      return {
        modified: false,
      };
    } else {
      if (newKey === previousKey) {
        return {
          modified: false,
        };
      }

      // At this point, it means that the item has been moved before receiving the ack
      // so we replace it at the right position

      const previousIndex = this._items.indexOf(child);

      const existingItemIndex = this._indexOfPosition(newKey);

      if (existingItemIndex !== -1) {
        this._items[existingItemIndex]._setParentLink(
          this,
          makePosition(
            newKey,
            this._items[existingItemIndex + 1]?._getParentKeyOrThrow()
          )
        );
      }

      child._setParentLink(this, newKey);
      this._sortItems();

      const newIndex = this._items.indexOf(child);

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

  /** @internal */
  private _applySetChildKeyUndoRedo(
    newKey: string,
    child: LiveNode
  ): ApplyResult {
    const previousKey = nn(child._parentKey);

    const previousIndex = this._items.indexOf(child);
    const existingItemIndex = this._indexOfPosition(newKey);

    // Assign a temporary position until we get the fix from the backend
    if (existingItemIndex !== -1) {
      this._items[existingItemIndex]._setParentLink(
        this,
        makePosition(
          newKey,
          this._items[existingItemIndex + 1]?._getParentKeyOrThrow()
        )
      );
    }

    child._setParentLink(this, newKey);

    this._sortItems();

    const newIndex = this._items.indexOf(child);

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
  _setChildKey(newKey: string, child: LiveNode, source: OpSource): ApplyResult {
    if (source === OpSource.REMOTE) {
      return this._applySetChildKeyRemote(newKey, child);
    } else if (source === OpSource.ACK) {
      return this._applySetChildKeyAck(newKey, child);
    } else {
      return this._applySetChildKeyUndoRedo(newKey, child);
    }
  }

  /** @internal */
  _apply(op: Op, isLocal: boolean): ApplyResult {
    return super._apply(op, isLocal);
  }

  /** @internal */
  _toSerializedCrdt(): SerializedList {
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
    return this._items.length;
  }

  /**
   * Adds one element to the end of the LiveList.
   * @param element The element to add to the end of the LiveList.
   */
  push(element: TItem): void {
    return this.insert(element, this.length);
  }

  /**
   * Inserts one element at a specified index.
   * @param element The element to insert.
   * @param index The index at which you want to insert the element.
   */
  insert(element: TItem, index: number): void {
    if (index < 0 || index > this._items.length) {
      throw new Error(
        `Cannot insert list item at index "${index}". index should be between 0 and ${this._items.length}`
      );
    }

    const before = this._items[index - 1]
      ? this._items[index - 1]._getParentKeyOrThrow()
      : undefined;
    const after = this._items[index]
      ? this._items[index]._getParentKeyOrThrow()
      : undefined;

    const position = makePosition(before, after);

    const value = lsonToLiveNode(element);
    value._setParentLink(this, position);

    this._insertAndSort(value);

    if (this._doc && this._id) {
      const id = this._doc.generateId();
      value._attach(id, this._doc);

      this._doc.dispatch(
        value._serialize(this._id, position, this._doc),
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
    if (targetIndex < 0) {
      throw new Error("targetIndex cannot be less than 0");
    }

    if (targetIndex >= this._items.length) {
      throw new Error(
        "targetIndex cannot be greater or equal than the list length"
      );
    }

    if (index < 0) {
      throw new Error("index cannot be less than 0");
    }

    if (index >= this._items.length) {
      throw new Error("index cannot be greater or equal than the list length");
    }

    let beforePosition = null;
    let afterPosition = null;

    if (index < targetIndex) {
      afterPosition =
        targetIndex === this._items.length - 1
          ? undefined
          : this._items[targetIndex + 1]._getParentKeyOrThrow();
      beforePosition = this._items[targetIndex]._getParentKeyOrThrow();
    } else {
      afterPosition = this._items[targetIndex]._getParentKeyOrThrow();
      beforePosition =
        targetIndex === 0
          ? undefined
          : this._items[targetIndex - 1]._getParentKeyOrThrow();
    }

    const position = makePosition(beforePosition, afterPosition);

    const item = this._items[index];
    const previousPosition = item._getParentKeyOrThrow();
    item._setParentLink(this, position);
    this._sortItems();

    if (this._doc && this._id) {
      const storageUpdates = new Map<string, LiveListUpdates<TItem>>([
        [this._id, makeUpdate(this, [moveDelta(index, targetIndex, item)])],
      ]);

      this._doc.dispatch(
        [
          {
            type: OpCode.SET_PARENT_KEY,
            id: nn(item._id),
            opId: this._doc.generateOpId(),
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
    if (index < 0 || index >= this._items.length) {
      throw new Error(
        `Cannot delete list item at index "${index}". index should be between 0 and ${
          this._items.length - 1
        }`
      );
    }

    const item = this._items[index];
    item._detach();
    this._items.splice(index, 1);

    if (this._doc) {
      const childRecordId = item._id;
      if (childRecordId) {
        const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
        storageUpdates.set(
          nn(this._id),
          makeUpdate(this, [deleteDelta(index)])
        );

        this._doc.dispatch(
          [
            {
              id: childRecordId,
              opId: this._doc.generateOpId(),
              type: OpCode.DELETE_CRDT,
            },
          ],
          item._serialize(nn(this._id), item._getParentKeyOrThrow()),
          storageUpdates
        );
      }
    }
  }

  clear(): void {
    if (this._doc) {
      const ops: Op[] = [];
      const reverseOps: Op[] = [];

      const updateDelta: LiveListUpdateDelta[] = [];

      for (const item of this._items) {
        item._detach();
        const childId = item._id;
        if (childId) {
          ops.push({
            type: OpCode.DELETE_CRDT,
            id: childId,
            opId: this._doc.generateOpId(),
          });
          reverseOps.push(
            ...item._serialize(nn(this._id), item._getParentKeyOrThrow())
          );

          // Index is always 0 because updates are applied one after another
          // when applied on an immutable state
          updateDelta.push(deleteDelta(0));
        }
      }

      this._items = [];

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(nn(this._id), makeUpdate(this, updateDelta));

      this._doc.dispatch(ops, reverseOps, storageUpdates);
    } else {
      for (const item of this._items) {
        item._detach();
      }
      this._items = [];
    }
  }

  set(index: number, item: TItem): void {
    if (index < 0 || index >= this._items.length) {
      throw new Error(
        `Cannot set list item at index "${index}". index should be between 0 and ${
          this._items.length - 1
        }`
      );
    }

    const existingItem = this._items[index];
    const position = existingItem._getParentKeyOrThrow();

    const existingId = existingItem._id;
    existingItem._detach();

    const value = lsonToLiveNode(item);
    value._setParentLink(this, position);
    this._items[index] = value;

    if (this._doc && this._id) {
      const id = this._doc.generateId();
      value._attach(id, this._doc);

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id, makeUpdate(this, [setDelta(index, value)]));

      const ops = value._serialize(this._id, position, this._doc);
      addIntentAndDeletedIdToOperation(ops, existingId);
      this._unacknowledgedSets.set(position, nn(ops[0].opId));
      const reverseOps = existingItem._serialize(this._id, position, undefined);
      addIntentAndDeletedIdToOperation(reverseOps, id);

      this._doc.dispatch(ops, reverseOps, storageUpdates);
    }
  }

  /**
   * Returns an Array of all the elements in the LiveList.
   */
  toArray(): TItem[] {
    return this._items.map(
      (entry) => liveNodeToLson(entry) as TItem
      //                               ^^^^^^^^
      //                               FIXME! This isn't safe.
    );
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
    if (index < 0 || index >= this._items.length) {
      return undefined;
    }

    return liveNodeToLson(this._items[index]) as TItem | undefined;
    //                                           ^^^^^^^^^^^^^^^^^
    //                                           FIXME! This isn't safe.
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
    return this._items.map((entry, i) =>
      callback(
        liveNodeToLson(entry) as TItem,
        //                    ^^^^^^^^
        //                    FIXME! This isn't safe.
        i
      )
    );
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
    return new LiveListIterator(this._items);
  }

  /** @internal */
  private _createAttachItemAndSort(
    op: CreateOp,
    key: string
  ): {
    newItem: LiveNode;
    newIndex: number;
  } {
    const newItem = creationOpToLiveNode(op);

    newItem._attach(op.id, nn(this._doc));
    newItem._setParentLink(this, key);

    this._insertAndSort(newItem);

    const newIndex = this._indexOfPosition(key);

    return { newItem, newIndex };
  }

  /** @internal */
  private _shiftItemPosition(index: number, key: string) {
    const shiftedPosition = makePosition(
      key,
      this._items.length > index + 1
        ? this._items[index + 1]?._getParentKeyOrThrow()
        : undefined
    );

    this._items[index]._setParentLink(this, shiftedPosition);
  }
}

class LiveListIterator<T extends Lson> implements IterableIterator<T> {
  private _innerIterator: IterableIterator<LiveNode>;

  constructor(items: Array<LiveNode>) {
    this._innerIterator = items[Symbol.iterator]();
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this;
  }

  next(): IteratorResult<T> {
    const result = this._innerIterator.next();

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

function deleteDelta(index: number): LiveListUpdateDelta {
  return {
    index,
    type: "delete",
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
    index,
    type: "move",
    previousIndex,
    item: item instanceof LiveRegister ? item.data : item,
  };
}

/**
 * This function is only temporary.
 * As soon as we refactor the operations structure,
 * serializing a LiveStructure should not know anything about intent
 */
function addIntentAndDeletedIdToOperation(
  ops: CreateChildOp[],
  deletedId: string | undefined
) {
  if (ops.length === 0) {
    throw new Error(
      "Internal error. Serialized LiveStructure should have at least 1 operation"
    );
  }

  const firstOp = ops[0];
  firstOp.intent = "set";
  firstOp.deletedId = deletedId;
}
