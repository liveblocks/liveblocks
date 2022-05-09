import { AbstractCrdt, Doc, ApplyResult } from "./AbstractCrdt";
import {
  deserialize,
  selfOrRegister,
  selfOrRegisterValue,
  creationOpToLiveStructure,
} from "./utils";
import {
  SerializedList,
  SerializedCrdtWithId,
  Op,
  CreateListOp,
  OpType,
  SerializedCrdt,
  CrdtType,
  CreateOp,
} from "./live";
import { makePosition, compare } from "./position";
import { LiveListUpdateDelta, LiveListUpdates } from "./types";
import { LiveRegister } from "./LiveRegister";
import { Lson } from "./lson";

type LiveListItem = [crdt: AbstractCrdt, position: string];

/**
 * The LiveList class represents an ordered collection of items that is synchronized across clients.
 */
export class LiveList<TItem extends Lson = Lson> extends AbstractCrdt {
  // TODO: Naive array at first, find a better data structure. Maybe an Order statistics tree?
  private _items: Array<AbstractCrdt>;

  constructor(items: TItem[] = []) {
    super();
    this._items = [];

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
      list._items.sort((itemA, itemB) =>
        compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
      );
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
      type: OpType.CreateList,
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
  _attachChild(op: CreateOp, isLocal: boolean): ApplyResult {
    if (this._doc == null) {
      throw new Error("Can't attach child if doc is not present");
    }

    const { id, parentKey, intent } = op;
    const key = parentKey!;
    const child = creationOpToLiveStructure(op);

    if (this._doc.getItem(id) !== undefined) {
      if (this._doc.getItem(id)?._getParentKeyOrThrow() !== parentKey) {
        // check if updated position is already used.
        const newPositionIndex = this._items.findIndex(
          (item) => item._getParentKeyOrThrow() === key
        );

        if (newPositionIndex !== -1) {
          // Shift position of existing item
          const shiftedPosition = makePosition(
            key,
            this._items.length > newPositionIndex + 1
              ? this._items[newPositionIndex + 1]?._getParentKeyOrThrow()
              : undefined
          );

          this._items[newPositionIndex]._setParentLink(this, shiftedPosition);
        }

        // Update position of the ACK item.
        this._doc.getItem(id)?._setParentLink(this, key);
        this._items.sort((itemA, itemB) =>
          compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
        );
      }

      return { modified: false };
    }

    const existingItemIndex = this._items.findIndex(
      (item) => item._getParentKeyOrThrow() === key
    );

    child._attach(id, this._doc);
    child._setParentLink(this, key);

    let newKey = key;

    if (intent === "set") {
      if (existingItemIndex !== -1) {
        const existingItem = this._items[existingItemIndex];
        existingItem._detach();
        const storageUpdate: LiveListUpdates<TItem> = {
          node: this,
          type: "LiveList",
          updates: [
            {
              index: existingItemIndex,
              type: "set",
              item: child instanceof LiveRegister ? child.data : child,
            },
          ],
        };

        this._items[existingItemIndex] = child;

        const reverse = existingItem._serialize(
          this._id!,
          key,
          this._doc,
          "set"
        );
        (reverse[0] as any).deletedId = op.id;

        const item = this._doc.getItem((op as any).deletedId);
        if (item) {
          item._apply({ type: OpType.DeleteCrdt, id: item._id! }, true);
        }

        return {
          modified: storageUpdate,
          reverse,
        };
      } else {
        this._items.push(child);
        this._items.sort((itemA, itemB) =>
          compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
        );

        const itemToDelete = this._doc.getItem((op as any).deletedId);
        if (itemToDelete) {
          itemToDelete._apply(
            { type: OpType.DeleteCrdt, id: itemToDelete._id! },
            true
          );
        }

        const newIndex = this._items.findIndex(
          (entry) => entry._getParentKeyOrThrow() === newKey
        );
        return {
          reverse: [{ type: OpType.DeleteCrdt, id }],
          modified: {
            node: this,
            type: "LiveList",
            updates: [
              {
                index: newIndex,
                type: "insert",
                item: child instanceof LiveRegister ? child.data : child,
              },
            ],
          },
        };
      }
    }

    // If there is a conflict
    if (existingItemIndex !== -1) {
      if (isLocal) {
        // If change is local => assign a temporary position to newly attached child
        const before = this._items[existingItemIndex]
          ? this._items[existingItemIndex]._getParentKeyOrThrow()
          : undefined;
        const after = this._items[existingItemIndex + 1]
          ? this._items[existingItemIndex + 1]._getParentKeyOrThrow()
          : undefined;

        newKey = makePosition(before, after);
        child._setParentLink(this, newKey);
      } else {
        // If change is remote => assign a temporary position to existing child until we get the fix from the backend
        const shiftedPosition = makePosition(
          key,
          this._items[existingItemIndex + 1]?._getParentKeyOrThrow()
        );
        this._items[existingItemIndex]._setParentLink(this, shiftedPosition);
      }
    }

    this._items.push(child);
    this._items.sort((itemA, itemB) =>
      compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
    );

    const newIndex = this._items.findIndex(
      (entry) => entry._getParentKeyOrThrow() === newKey
    );
    return {
      reverse: [{ type: OpType.DeleteCrdt, id }],
      modified: {
        node: this,
        type: "LiveList",
        updates: [
          {
            index: newIndex,
            type: "insert",
            item: child instanceof LiveRegister ? child.data : child,
          },
        ],
      },
    };
  }

  /**
   * @internal
   */
  _detachChild(child: AbstractCrdt): ApplyResult {
    if (child) {
      const reverse = child._serialize(this._id!, child._parentKey!, this._doc);

      const indexToDelete = this._items.findIndex((item) => item === child);
      this._items.splice(indexToDelete, 1);

      child._detach();

      const storageUpdate: LiveListUpdates<TItem> = {
        node: this,
        type: "LiveList",
        updates: [{ index: indexToDelete, type: "delete" }],
      };

      return { modified: storageUpdate, reverse };
    }

    return { modified: false };
  }

  /**
   * @internal
   */
  _setChildKey(
    key: string,
    child: AbstractCrdt,
    previousKey: string
  ): ApplyResult {
    const previousIndex = this._items.indexOf(child);
    const existingItemIndex = this._items.findIndex(
      (item) => item._getParentKeyOrThrow() === key
    );

    // Assign a temporary position until we get the fix from the backend
    if (existingItemIndex !== -1) {
      this._items[existingItemIndex]._setParentLink(
        this,
        makePosition(
          key,
          this._items[existingItemIndex + 1]?._getParentKeyOrThrow()
        )
      );
    }

    child._setParentLink(this, key);

    this._items.sort((itemA, itemB) =>
      compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
    );

    const newIndex = this._items.indexOf(child);

    const updatesDelta: LiveListUpdateDelta[] =
      newIndex === previousIndex
        ? []
        : [
            {
              index: newIndex,
              item: child instanceof LiveRegister ? child.data : child,
              previousIndex: previousIndex,
              type: "move",
            },
          ];
    return {
      modified: {
        node: this,
        type: "LiveList",
        updates: updatesDelta,
      },
      reverse: [
        {
          type: OpType.SetParentKey,
          id: child._id!,
          parentKey: previousKey,
        },
      ],
    };
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
      type: CrdtType.List,
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
    this._items.sort((itemA, itemB) =>
      compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
    );

    if (this._doc && this._id) {
      const id = this._doc.generateId();
      value._attach(id, this._doc);

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id, {
        node: this,
        type: "LiveList",
        updates: [
          {
            index: index,
            item: value instanceof LiveRegister ? value.data : value,
            type: "insert",
          },
        ],
      });
      this._doc.dispatch(
        value._serialize(this._id, position, this._doc),
        [{ type: OpType.DeleteCrdt, id }],
        storageUpdates
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
    this._items.sort((itemA, itemB) =>
      compare(itemA._getParentKeyOrThrow(), itemB._getParentKeyOrThrow())
    );

    if (this._doc && this._id) {
      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id, {
        node: this,
        type: "LiveList",
        updates: [
          {
            index: targetIndex,
            previousIndex: index,
            item: item instanceof LiveRegister ? item.data : item,
            type: "move",
          },
        ],
      });

      this._doc.dispatch(
        [
          {
            type: OpType.SetParentKey,
            id: item._id!,
            opId: this._doc.generateOpId(),
            parentKey: position,
          },
        ],
        [
          {
            type: OpType.SetParentKey,
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
        storageUpdates.set(this._id!, {
          node: this,
          type: "LiveList",
          updates: [{ index: index, type: "delete" }],
        });

        this._doc.dispatch(
          [
            {
              id: childRecordId,
              opId: this._doc.generateOpId(),
              type: OpType.DeleteCrdt,
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
          ops.push({ id: childId, type: OpType.DeleteCrdt });
          reverseOps.push(
            ...item._serialize(this._id!, item._getParentKeyOrThrow())
          );

          updateDelta.push({ index: i, type: "delete" });
        }

        i++;
      }

      this._items = [];

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id!, {
        node: this,
        type: "LiveList",
        updates: updateDelta,
      });

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

    const existingId = existingItem._id;
    existingItem._detach();

    const value = selfOrRegister(item);
    value._setParentLink(this, position);
    this._items[index] = value;

    if (this._doc && this._id) {
      const id = this._doc.generateId();
      value._attach(id, this._doc);

      const storageUpdates = new Map<string, LiveListUpdates<TItem>>();
      storageUpdates.set(this._id, {
        node: this,
        type: "LiveList",
        updates: [
          {
            index,
            item: value instanceof LiveRegister ? value.data : value,
            type: "set",
          },
        ],
      });

      const ops = value._serialize(this._id, position, this._doc, "set");
      (ops[0] as any).deletedId = existingId;

      const reverseOps = existingItem._serialize(
        this._id,
        position,
        undefined,
        "set"
      );
      (reverseOps[0] as any).deletedId = id;

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
