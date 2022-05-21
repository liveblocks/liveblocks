import { reverse } from "lodash";
import type { ApplyResult, Doc } from "./AbstractCrdt";
import { AbstractCrdt, OpSource } from "./AbstractCrdt";
import { LiveRegister } from "./LiveRegister";
import { comparePosition as compare, makePosition } from "./position";
import type {
  CreateListOp,
  CreateOp,
  LiveListUpdateDelta,
  LiveListUpdates,
  Lson,
  Op,
  SerializedCrdt,
  SerializedCrdtWithId,
  SerializedList,
  StorageUpdate,
} from "./types";
import { CrdtType, OpCode } from "./types";
import {
  creationOpToLiveStructure,
  deserialize,
  selfOrRegister,
  selfOrRegisterValue,
} from "./utils";

/**
 * The LiveList class represents an ordered collection of items that is synchronized across clients.
 */
export class LiveList<TItem extends Lson> extends AbstractCrdt {
  // TODO: Naive array at first, find a better data structure. Maybe an Order statistics tree?
  private _items: Array<AbstractCrdt>;

  private _implicitlyDeletedItems: Set<AbstractCrdt>;

  constructor(items: TItem[] = []) {
    super();
    this._items = [];
    this._implicitlyDeletedItems = new Set<AbstractCrdt>();

    let position = undefined;
    for (let i = 0; i < items.length; i++) {
      const newPosition = makePosition(position);
      const item = selfOrRegister(items[i]);
      item._setParentLink(this, newPosition);
      this._items.push(item);
      position = newPosition;
    }
  }

  /**
   * @internal
   */
  static _deserialize(
    [id]: [id: string, item: SerializedList],
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    const list = new LiveList([]);
    list._attach(id, doc);

    const children = parentToChildren.get(id);

    if (children == null) {
      return list;
    }

    for (const entry of children) {
      const child = deserialize(entry, parentToChildren, doc);

      child._setParentLink(list, entry[1].parentKey!);

      list._items.push(child);
      sortListItem(list._items);
    }

    return list;
  }

  /**
   * @internal
   */
  _serialize(
    parentId?: string,
    parentKey?: string,
    doc?: Doc,
    intent?: "set"
  ): Op[] {
    if (this._id == null) {
      throw new Error("Cannot serialize item is not attached");
    }

    if (parentId == null || parentKey == null) {
      throw new Error(
        "Cannot serialize list if parentId or parentKey is undefined"
      );
    }

    const ops = [];
    const op: CreateListOp = {
      id: this._id,
      opId: doc?.generateOpId(),
      intent,
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
   */
  _indexOfPosition(position: string): number {
    return this._items.findIndex(
      (item) => item._getParentKeyOrThrow() === position
    );
  }

  /**
   * @internal
   */
  _attach(id: string, doc: Doc) {
    super._attach(id, doc);

    for (const item of this._items) {
      item._attach(doc.generateId(), doc);
    }
  }

  /**
   * @internal
   */
  _detach() {
    super._detach();

    for (const item of this._items) {
      item._detach();
    }
  }

  /**
   * @internal
   */
  _applyRemoteSet(op: CreateOp): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const { id, parentKey } = op;
    const key = parentKey!;
    const child = creationOpToLiveStructure(op);
    child._attach(id, this._doc);
    child._setParentLink(this, key);

    const deletedId = op.deletedId;

    const existingItemIndex = this._indexOfPosition(key);

    // If there is already an item at this position
    if (existingItemIndex !== -1) {
      const existingItem = this._items[existingItemIndex];

      // No conflict, item at position to be replaced is the same than server
      if (existingItem._id === deletedId) {
        existingItem._detach();

        this._items[existingItemIndex] = child;

        return {
          modified: makeUpdate(this, [setDelta(existingItemIndex, child)]),
          reverse: [],
        };
      } else {
        // item at position to be replaced is different from server
        this._implicitlyDeletedItems.add(existingItem);

        this._items[existingItemIndex] = child;

        const delta: LiveListUpdateDelta[] = [
          setDelta(existingItemIndex, child),
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

      this._items.push(child);
      sortListItem(this._items);

      updates.push(insertDelta(this._indexOfPosition(key), child));

      return {
        reverse: [],
        modified: makeUpdate(this, updates),
      };
    }
  }

  /**
   * @internal
   */
  _applySetAck(op: CreateOp): ApplyResult {
    const delta: LiveListUpdateDelta[] = [];

    // Deleted item can be re-inserted by remote undo/redo
    const deletedDelta = this._detachItemAssociatedToSetOperation(op.deletedId);
    if (deletedDelta) {
      delta.push(deletedDelta);
    }

    const indexOfItemWithSamePosition = this._indexOfPosition(op.parentKey!);

    const existingItem = this._items.find((item) => item._id === op.id);

    // If item already exists...
    if (existingItem != null) {
      // ...and if it's at the right position
      if (existingItem._parentKey === op.parentKey) {
        // ... do nothing
        if (delta.length > 0) {
          return {
            modified: makeUpdate(this, delta),
            reverse: [],
          };
        } else {
          return {
            modified: false,
          };
        }
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

      existingItem._setParentLink(this, op.parentKey!);
      sortListItem(this._items);

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
      const orphan = this._doc!.getItem(op.id);

      if (orphan && this._implicitlyDeletedItems.has(orphan)) {
        orphan._setParentLink(this, op.parentKey!);
        this._implicitlyDeletedItems.delete(orphan);

        this._items.push(orphan);
        sortListItem(this._items);

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
        const { newItem, newIndex } = this._createAttachItemAndSort(
          op,
          op.parentKey!
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
  _detachItemAssociatedToSetOperation(
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

  /**
   * @internal
   */
  _applyRemoteInsert(op: CreateOp): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const key = op.parentKey!;

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

  /**
   * @internal
   */
  _applyInsertAck(op: CreateOp): ApplyResult {
    const existingItem = this._items.find((item) => item._id === op.id);
    const key = op.parentKey!;

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
        sortListItem(this._items);

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
      const orphan = this._doc!.getItem(op.id);

      if (orphan && this._implicitlyDeletedItems.has(orphan)) {
        // Implicit delete after set
        orphan._setParentLink(this, key);
        this._implicitlyDeletedItems.delete(orphan);

        this._items.push(orphan);
        sortListItem(this._items);

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

  /**
   * @internal
   */
  _applyInsertUndoRedo(op: CreateOp): ApplyResult {
    const { id, parentKey } = op;
    const key = parentKey!;
    const child = creationOpToLiveStructure(op);

    if (this._doc?.getItem(id) !== undefined) {
      return { modified: false };
    }

    child._attach(id, this._doc!);
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

    this._items.push(child);
    sortListItem(this._items);

    const newIndex = this._indexOfPosition(newKey);

    return {
      modified: makeUpdate(this, [insertDelta(newIndex, child)]),
      reverse: [{ type: OpCode.DELETE_CRDT, id }],
    };
  }

  /**
   * @internal
   */
  _applySetUndoRedo(op: CreateOp): ApplyResult {
    const { id, parentKey } = op;
    const key = parentKey!;
    const child = creationOpToLiveStructure(op);

    if (this._doc?.getItem(id) !== undefined) {
      return { modified: false };
    }

    const indexOfItemWithSameKey = this._indexOfPosition(key);

    child._attach(id, this._doc!);
    child._setParentLink(this, key);

    const newKey = key;

    // If there is already an item at this position
    if (indexOfItemWithSameKey !== -1) {
      // TODO: Should we add this item to implictly deleted item?
      const existingItem = this._items[indexOfItemWithSameKey];
      existingItem._detach();

      this._items[indexOfItemWithSameKey] = child;

      const reverse = existingItem._serialize(this._id!, key, this._doc);
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
      this._items.push(child);
      sortListItem(this._items);

      // TODO: Use delta
      this._detachItemAssociatedToSetOperation(op.deletedId);

      const newIndex = this._indexOfPosition(newKey);

      return {
        reverse: [{ type: OpCode.DELETE_CRDT, id }],
        modified: makeUpdate(this, [insertDelta(newIndex, child)]),
      };
    }
  }

  /**
   * @internal
   */
  _attachChild(op: CreateOp, source: OpSource): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    if (op.intent === "set") {
      if (source === OpSource.REMOTE) {
        return this._applyRemoteSet(op);
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

  /**
   * @internal
   */
  _detachChild(
    child: AbstractCrdt
  ): { reverse: Op[]; modified: LiveListUpdates<TItem> } | { modified: false } {
    if (child) {
      const reverse = child._serialize(this._id!, child._parentKey!, this._doc);

      const indexToDelete = this._items.indexOf(child);

      this._items.splice(indexToDelete, 1);

      child._detach();

      return {
        modified: makeUpdate(this, [deleteDelta(indexToDelete)]),
        reverse,
      };
    }

    return { modified: false };
  }

  /**
   * @internal
   */
  _applySetChildKeyRemote(newKey: string, child: AbstractCrdt): ApplyResult {
    if (this._implicitlyDeletedItems.has(child)) {
      this._implicitlyDeletedItems.delete(child);

      child._setParentLink(this, newKey);
      this._items.push(child);
      sortListItem(this._items);

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
      sortListItem(this._items);
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
      sortListItem(this._items);
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

  /**
   * @internal
   */
  _applySetChildKeyAck(newKey: string, child: AbstractCrdt): ApplyResult {
    const previousKey = child._parentKey!;

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
      this._items.push(child);
      sortListItem(this._items);

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
      sortListItem(this._items);

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

  /**
   * @internal
   */
  _applySetChildKeyUndoRedo(newKey: string, child: AbstractCrdt): ApplyResult {
    const previousKey = child._parentKey!;

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

    sortListItem(this._items);

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
          id: child._id!,
          parentKey: previousKey,
        },
      ],
    };
  }

  /**
   * @internal
   */
  _setChildKey(
    newKey: string,
    child: AbstractCrdt,
    source: OpSource
  ): ApplyResult {
    if (source === OpSource.REMOTE) {
      return this._applySetChildKeyRemote(newKey, child);
    } else if (source === OpSource.ACK) {
      return this._applySetChildKeyAck(newKey, child);
    } else {
      return this._applySetChildKeyUndoRedo(newKey, child);
    }
  }

  /**
   * @internal
   */
  _apply(op: Op, isLocal: boolean) {
    return super._apply(op, isLocal);
  }

  /**
   * @internal
   */
  _toSerializedCrdt(): SerializedCrdt {
    return {
      type: CrdtType.LIST,
      parentId: this._parent?._id!,
      parentKey: this._parentKey!,
    };
  }

  /**
   * Returns the number of elements.
   */
  get length() {
    return this._items.length;
  }

  /**
   * Adds one element to the end of the LiveList.
   * @param element The element to add to the end of the LiveList.
   */
  push(element: TItem) {
    return this.insert(element, this.length);
  }

  /**
   * Inserts one element at a specified index.
   * @param element The element to insert.
   * @param index The index at which you want to insert the element.
   */
  insert(element: TItem, index: number) {
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

    const value = selfOrRegister(element);
    value._setParentLink(this, position);

    this._items.push(value);
    sortListItem(this._items);

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
  move(index: number, targetIndex: number) {
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
    sortListItem(this._items);

    if (this._doc && this._id) {
      const storageUpdates = new Map<string, LiveListUpdates<TItem>>([
        [this._id, makeUpdate(this, [moveDelta(index, targetIndex, item)])],
      ]);

      this._doc.dispatch(
        [
          {
            type: OpCode.SET_PARENT_KEY,
            id: item._id!,
            opId: this._doc.generateOpId(),
            parentKey: position,
          },
        ],
        [
          {
            type: OpCode.SET_PARENT_KEY,
            id: item._id!,
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
  delete(index: number) {
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
        storageUpdates.set(this._id!, makeUpdate(this, [deleteDelta(index)]));

        this._doc.dispatch(
          [
            {
              id: childRecordId,
              opId: this._doc.generateOpId(),
              type: OpCode.DELETE_CRDT,
            },
          ],
          item._serialize(this._id!, item._getParentKeyOrThrow()),
          storageUpdates
        );
      }
    }
  }

  clear() {
    if (this._doc) {
      const ops: Op[] = [];
      const reverseOps: Op[] = [];

      const updateDelta: LiveListUpdateDelta[] = [];

      let i = 0;
      for (const item of this._items) {
        item._detach();
        const childId = item._id;
        if (childId) {
          ops.push({ id: childId, type: OpCode.DELETE_CRDT });
          reverseOps.push(
            ...item._serialize(this._id!, item._getParentKeyOrThrow())
          );

          updateDelta.push(deleteDelta(i));
        }

        i++;
      }

      this._items = [];

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id!, makeUpdate(this, updateDelta));

      this._doc.dispatch(ops, reverseOps, storageUpdates);
    } else {
      for (const item of this._items) {
        item._detach();
      }
      this._items = [];
    }
  }

  set(index: number, item: TItem) {
    if (index < 0 || index >= this._items.length) {
      throw new Error(
        `Cannot set list item at index "${index}". index should be between 0 and ${
          this._items.length - 1
        }`
      );
    }

    const existingItem = this._items[index];
    const position = existingItem._getParentKeyOrThrow();

    const existingId = existingItem._id!;
    existingItem._detach();

    const value = selfOrRegister(item);
    value._setParentLink(this, position);
    this._items[index] = value;

    if (this._doc && this._id) {
      const id = this._doc.generateId();
      value._attach(id, this._doc);

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id, makeUpdate(this, [setDelta(index, value)]));

      const ops = value._serialize(this._id, position, this._doc);
      addIntentAndDeletedIdToOperation(ops, existingId);
      const reverseOps = existingItem._serialize(this._id, position, undefined);
      addIntentAndDeletedIdToOperation(reverseOps, id);

      this._doc.dispatch(ops, reverseOps, storageUpdates);
    }
  }

  /**
   * Returns an Array of all the elements in the LiveList.
   */
  toArray(): TItem[] {
    return this._items.map((entry) => selfOrRegisterValue(entry));
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

    return selfOrRegisterValue(this._items[index]);
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
      callback(selfOrRegisterValue(entry), i)
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

  /**
   * @internal
   */
  _createAttachItemAndSort(
    op: CreateOp,
    key: string
  ): {
    newItem: AbstractCrdt;
    newIndex: number;
  } {
    const newItem = creationOpToLiveStructure(op);

    newItem._attach(op.id, this._doc!);
    newItem._setParentLink(this, key);

    this._items.push(newItem);
    sortListItem(this._items);

    const newIndex = this._indexOfPosition(key);

    return { newItem, newIndex };
  }

  /**
   * @internal
   */
  _shiftItemPosition(index: number, key: string) {
    const shiftedPosition = makePosition(
      key,
      this._items.length > index + 1
        ? this._items[index + 1]?._getParentKeyOrThrow()
        : undefined
    );

    this._items[index]._setParentLink(this, shiftedPosition);
  }
}

class LiveListIterator<T> implements IterableIterator<T> {
  private _innerIterator: IterableIterator<AbstractCrdt>;

  constructor(items: Array<AbstractCrdt>) {
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

    return {
      value: selfOrRegisterValue(result.value),
    };
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

function setDelta(index: number, item: AbstractCrdt): LiveListUpdateDelta {
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

function insertDelta(index: number, item: AbstractCrdt): LiveListUpdateDelta {
  return {
    index,
    type: "insert",
    item: item instanceof LiveRegister ? item.data : item,
  };
}

function moveDelta(
  previousIndex: number,
  index: number,
  item: AbstractCrdt
): LiveListUpdateDelta {
  return {
    index,
    type: "move",
    previousIndex,
    item: item instanceof LiveRegister ? item.data : item,
  };
}

function sortListItem(items: AbstractCrdt[]) {
  items.sort((itemA, itemB) =>
    compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
  );
}

/**
 * This function is only temporary.
 * As soon as we refactor the operations structure,
 * serializing a LiveStructure should not know anything about intent
 */
function addIntentAndDeletedIdToOperation(ops: Op[], deletedId: string) {
  if (ops.length === 0) {
    throw new Error(
      "Internal error. Serialized LiveStructure should have at least 1 operation"
    );
  }

  const firstOp = ops[0];
  if (
    firstOp.type !== OpCode.CREATE_LIST &&
    firstOp.type !== OpCode.CREATE_OBJECT &&
    firstOp.type !== OpCode.CREATE_REGISTER &&
    firstOp.type !== OpCode.CREATE_MAP
  ) {
    throw new Error(
      "Internal error. Serialized LiveStructure first op should be CreateOp"
    );
  }

  firstOp.intent = "set";
  firstOp.deletedId = deletedId;
}
