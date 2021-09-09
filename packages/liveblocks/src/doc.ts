import { remove } from "./utils";
import {
  CrdtType,
  CreateListOp,
  CreateMapOp,
  CreateObjectOp,
  DeleteObjectKeyOp,
  DeleteCrdtOp,
  Op,
  OpType,
  UpdateObjectOp,
  SerializedCrdtWithId,
  SerializedList,
  SerializedMap,
  SetParentKeyOp,
  CreateRegisterOp,
} from "./live";
import { compare, makePosition } from "./position";

type Dispatch = (ops: Op[]) => void;

function noOp() {}

export class Doc<T extends Record<string, any> = Record<string, any>> {
  #clock = 0;
  #items = new Map<string, AbstractCrdt>();
  #root: LiveObject<T>;
  #actor: number;
  #dispatch: Dispatch;

  private constructor(
    root: LiveObject<T>,
    actor: number = 0,
    dispatch: Dispatch = noOp
  ) {
    this.#root = root;
    this.#actor = actor;
    this.#dispatch = dispatch;
  }

  static from<T>(root: T, actor: number = 0, dispatch: Dispatch = noOp) {
    const rootRecord = new LiveObject(root) as LiveObject<T>;
    const storage = new Doc(rootRecord, actor, dispatch) as Doc<T>;
    rootRecord._attach(storage.generateId(), storage);
    storage.dispatch(rootRecord._serialize());
    return storage;
  }

  static load<T>(
    items: SerializedCrdtWithId[],
    actor: number,
    dispatch: Dispatch = noOp
  ): Doc<T> {
    if (items.length === 0) {
      throw new Error("Internal error: cannot load storage without items");
    }

    const parentToChildren = new Map<string, SerializedCrdtWithId[]>();
    let root = null;

    for (const tuple of items) {
      const parentId = tuple[1].parentId;
      if (parentId == null) {
        root = tuple;
      } else {
        const children = parentToChildren.get(parentId);
        if (children != null) {
          children.push(tuple);
        } else {
          parentToChildren.set(parentId, [tuple]);
        }
      }
    }

    if (root == null) {
      throw new Error("Root can't be null");
    }

    const doc = new Doc<T>(null as any as LiveObject<T>, actor, dispatch);
    doc.#root = LiveObject._deserialize(
      root,
      parentToChildren,
      doc
    ) as LiveObject<T>;
    return doc;
  }

  dispatch(ops: Op[]) {
    this.#dispatch(ops);
  }

  addItem(id: string, item: AbstractCrdt) {
    this.#items.set(id, item);
  }

  deleteItem(id: string) {
    this.#items.delete(id);
  }

  getItem(id: string) {
    return this.#items.get(id);
  }

  apply(op: Op) {
    switch (op.type) {
      case OpType.UpdateObject: {
        this.#applyUpdateRecord(op);
        break;
      }
      case OpType.CreateObject: {
        this.#applyCreateObject(op);
        break;
      }
      case OpType.CreateMap: {
        this.#applyCreateMap(op);
        break;
      }
      case OpType.CreateList: {
        this.#applyCreateList(op);
        break;
      }
      case OpType.DeleteCrdt: {
        this.#applyDeleteRecord(op);
        break;
      }
      case OpType.SetParentKey: {
        this.#applySetParentKey(op);
        break;
      }
      case OpType.DeleteObjectKey: {
        this.#applyDeleteRecordKey(op);
        break;
      }
      case OpType.CreateRegister: {
        this.#applyCreateRegister(op);
        break;
      }
    }
  }

  #applyCreateRegister(op: CreateRegisterOp) {
    const parent = this.#items.get(op.parentId);

    if (parent == null) {
      return;
    }

    if (!(parent instanceof LiveMap) && !(parent instanceof LiveList)) {
      throw new Error(
        "LiveRegister can only be attached to a LiveMap or LiveList"
      );
    }

    const newRegister = new LiveRegister(op.data);
    parent._attachChild(op.id, op.parentKey, newRegister);
  }

  #applyDeleteRecordKey(op: DeleteObjectKeyOp) {
    const item = this.#items.get(op.id);
    if (item && item instanceof LiveObject) {
      item._apply(op);
    }
  }

  #applyUpdateRecord(op: UpdateObjectOp) {
    const item = this.#items.get(op.id);
    if (item && item instanceof LiveObject) {
      item._apply(op);
    }
  }

  #applyCreateMap(op: CreateMapOp) {
    const parent = this.#items.get(op.parentId);
    if (parent == null) {
      return;
    }

    const newMap = new LiveMap();
    parent._attachChild(op.id, op.parentKey, newMap);
  }

  #applyCreateList(op: CreateListOp) {
    const parent = this.#items.get(op.parentId);
    if (parent == null) {
      return;
    }

    const list = new LiveList();
    parent._attachChild(op.id, op.parentKey, list);
  }

  #applyCreateObject(op: CreateObjectOp) {
    if (op.parentId && op.parentKey) {
      const parent = this.#items.get(op.parentId);
      if (parent == null) {
        return;
      }
      
      const newObj = new LiveObject(op.data);
      parent._attachChild(op.id, op.parentKey, newObj);
    }
  }

  #applyDeleteRecord(op: DeleteCrdtOp) {
    const item = this.#items.get(op.id);

    if (item == null) {
      return;
    }

    const parent = item._parent;

    if (parent == null) {
      return;
    }

    if (parent) {
      parent._detachChild(item);
    }
  }

  #applySetParentKey(op: SetParentKeyOp) {
    const item = this.#items.get(op.id);

    if (item == null) {
      return;
    }

    if (item._parent == null) {
      return;
    }

    if (item._parent instanceof LiveList) {
      item._parent._setChildKey(op.parentKey, item);
    }
  }

  get root(): LiveObject<T> {
    return this.#root;
  }

  count() {
    return this.#items.size;
  }

  generateId() {
    return `${this.#actor}:${this.#clock++}`;
  }
}

abstract class AbstractCrdt {
  #listeners: Array<() => void> = [];
  #deepListeners: Array<() => void> = [];
  #parent?: AbstractCrdt;
  #doc?: Doc;
  #id?: string;

  /**
   * INTERNAL 
   */
  protected get _doc() {
    return this.#doc;
  }

  /**
   * INTERNAL 
   */
  get _id() {
    return this.#id;
  }

  /**
   * INTERNAL 
   */
  get _parent() {
    return this.#parent;
  }
  
  /**
   * INTERNAL 
   */
  _setParent(parent: AbstractCrdt) {
    if(this.#parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.#parent = parent;
  }

  /**
   * INTERNAL 
   */
  _attach(id: string, doc: Doc) {
    if(this.#id || this.#doc) {
      throw new Error("Cannot attach if CRDT is already attached");
    }

    doc.addItem(id, this);

    this.#id = id;
    this.#doc = doc;
  }

  abstract _attachChild(id: string, key: string, crdt: AbstractCrdt): void;

  /**
   * INTERNAL 
   */
  _detach() {
    if(this.#doc && this.#id) {
      this.#doc.deleteItem(this.#id)
    }

    this.#parent = undefined;
    this.#doc = undefined;
  }

  abstract _detachChild(crdt: AbstractCrdt): void;

  subscribe(listener: () => void) {
    this.#listeners.push(listener);
  }

  subscribeDeep(listener: () => void) {
    this.#deepListeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    remove(this.#listeners, listener);
  }

  unsubscribeDeep(listener: () => void) {
    remove(this.#deepListeners, listener);
  }

  notify(onlyDeep = false) {
    if(onlyDeep === false) {
      for (const listener of this.#listeners) {
        listener();
      }
    }

    for (const listener of this.#deepListeners) {
      listener();
    }

    if(this._parent) {
      this._parent.notify(true);
    }
  }

  abstract _serialize(parentId: string, parentKey: string): Op[];
}

export class LiveObject<T extends Record<string, any> = Record<string, any>> extends AbstractCrdt {
  #map: Map<string, any>;

  constructor(object: T = {} as T) {
    super();

    for(const key in object) {
      const value = object[key] as any;
      if(value instanceof AbstractCrdt) {
        value._setParent(this);
      }
    }

    this.#map = new Map(Object.entries(object));
  }

  /**
   * INTERNAL 
   */
  _serialize(parentId?: string, parentKey?: string): Op[] {
    if(this._id == null) {
      throw new Error("Cannot serialize item is not attached")
    }

    const ops = [];
    const op: CreateObjectOp = {
      id: this._id,
      type: OpType.CreateObject,
      parentId,
      parentKey,
      data: {}
    };

    ops.push(op);

    for (const [key, value] of this.#map) {
      if (value instanceof AbstractCrdt) {
        ops.push(...value._serialize(this._id, key))
      } else {
        op.data[key] = value;
      }
    }

    return ops;
  }

  /**
   * INTERNAL 
   */
  static _deserialize(
    [id, item]: SerializedCrdtWithId,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    if (item.type !== CrdtType.Object) {
      throw new Error(
        `Tried to deserialize a record but item type is "${item.type}"`
      );
    }

    const object = new LiveObject(item.data);
    object._attach(id, doc);

    const children = parentToChildren.get(id);

    if (children == null) {
      return object;
    }

    for (const entry of children) {
      const crdt = entry[1];
      if (crdt.parentKey == null) {
        throw new Error(
          "Tried to deserialize a crdt but it does not have a parentKey and is not the root"
        );
      }

      const child = deserialize(entry, parentToChildren, doc);
      child._setParent(object);
      object.#map.set(crdt.parentKey, child);
    }

    return object;
  }

  /**
   * INTERNAL 
   */
  _attach(
    id: string,
    doc: Doc,
  ) {
    super._attach(id, doc);
    
    for (const [key, value] of this.#map) {
      if (value instanceof AbstractCrdt) {
        value._attach(doc.generateId(), doc);
      }
    }
  }

  /**
   * INTERNAL 
   */
  _attachChild(id: string, key: keyof T, child: AbstractCrdt) {
    if(this._doc == null) {
      throw new Error("Can't attach child if doc is not present")
    }

    const previousValue = this.#map.get(key as string);
    if (isCrdt(previousValue)) {
      previousValue._detach();
    }

    this.#map.set(key as string, child);
    child._setParent(this);
    child._attach(id, this._doc);
    this.notify();
  }

  /**
   * INTERNAL 
   */
  _detachChild(child: AbstractCrdt) {
    for (const [key, value] of this.#map) {
      if (value === child) {
        this.#map.delete(key);
      }
    }

    if (child) {
      child._detach();
    }

    this.notify();
  }

  /**
   * INTERNAL 
   */
  _detach() {
    super._detach();

    for(const value of this.#map.values()) {
      if(isCrdt(value)) {
        value._detach();
      }
    }
  }

  /**
   * INTERNAL 
   */
  _apply(op: Op) {
    if (op.type === OpType.UpdateObject) {
      for (const key in op.data as Partial<T>) {
        const oldValue = this.#map.get(key);

        if (isCrdt(oldValue)) {
          oldValue._detach();
        }

        const value = op.data[key];
        this.#map.set(key, value);
      }
      this.notify();
    } else if (op.type === OpType.DeleteObjectKey) {
      const key = op.key;
      const oldValue = this.#map.get(key);

      if (isCrdt(oldValue)) {
        oldValue._detach();
      }

      this.#map.delete(key);
      this.notify();
    }
  }

  toObject(): T {
    return Object.fromEntries(this.#map) as T;
  }

  set<TKey extends keyof T>(key: TKey, value: T[TKey]) {
    // TODO: Find out why typescript complains
    this.update({ [key]: value } as any as Partial<T>);
  }

  get<TKey extends keyof T>(key: TKey): T[TKey] {
    return this.#map.get(key as string);
  }

  // delete<TKey extends keyof T>(key: TKey) {
  //   if (this.doc && this.id) {
  //     const item = this._map.get(key as string);

  //     if (isCrdt(item)) {
  //       item.detach();
  //     }

  //     this.doc.dispatch([
  //       { type: OpType.DeleteObjectKey, id: this.id, key: key as string },
  //     ]);
  //   }

  //   this._map.delete(key as string);
  //   this.notify();
  // }

  update(overrides: Partial<T>) {
    if(this._doc && this._id) {
      const ops = [];
      const updateOp: UpdateObjectOp = {
        id: this._id,
        type: OpType.UpdateObject,
        data: { }
      };
      ops.push(updateOp);

      for (const key in overrides) {
        const oldValue = this.#map.get(key);
  
        if(oldValue instanceof LiveObject) {
          oldValue._detach();
        }
  
        const newValue = overrides[key] as any;
  
        if(newValue instanceof AbstractCrdt) {
          newValue._setParent(this);
          newValue._attach(this._doc.generateId(), this._doc);
          ops.push(...newValue._serialize(this._id, key));
        } else {
          updateOp.data[key] = newValue;
        }
  
        this.#map.set(key, newValue);
      }

      this._doc.dispatch(ops);
      this.notify();

      return;
    }
    
    for (const key in overrides) {
      const oldValue = this.#map.get(key);

      if(oldValue instanceof AbstractCrdt) {
        oldValue._detach();
      }

      const newValue = overrides[key] as any;

      if(newValue instanceof AbstractCrdt) {
        newValue._setParent(this);
      }

      this.#map.set(key, newValue);
    }

    this.notify();
  }
}

export class LiveMap<TKey extends string, TValue>
  extends AbstractCrdt
{
  #map: Map<TKey, AbstractCrdt>;

  constructor(
    entries?: readonly (readonly [TKey, TValue])[] | null | undefined
  ) {
    super();
    if (entries) {
      const mappedEntries: Array<[TKey,AbstractCrdt]> = [];
      for(const entry of entries) {
        const value = selfOrRegister(entry[1]);
        value._setParent(this);
        mappedEntries.push([entry[0], value]);
      }

      this.#map = new Map(
        mappedEntries
      );
    } else {
      this.#map = new Map();
    }
  }

  /**
   * INTERNAL 
   */
  _serialize(parentId?: string, parentKey?: string): Op[] {
    if(this._id == null) {
      throw new Error("Cannot serialize item is not attached")
    }

    if(parentId == null || parentKey == null) {
      throw new Error("Cannot serialize map if parentId or parentKey is undefined")
    }

    const ops = [];
    const op: CreateMapOp = {
      id: this._id,
      type: OpType.CreateMap,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const [key, value] of this.#map) {
      ops.push(...value._serialize(this._id, key));
    }

    return ops;
  }

  /**
   * INTERNAL 
   */
  static _deserialize(
    [id, item]: SerializedCrdtWithId,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    if (item.type !== CrdtType.Map) {
      throw new Error(
        `Tried to deserialize a map but item type is "${item.type}"`
      );
    }

    const map = new LiveMap();
    map._attach(id, doc);

    const children = parentToChildren.get(id);

    if (children == null) {
      return map;
    }

    for (const entry of children) {
      const crdt = entry[1];
      if (crdt.parentKey == null) {
        throw new Error(
          "Tried to deserialize a crdt but it does not have a parentKey and is not the root"
        );
      }

      const child = deserialize(entry, parentToChildren, doc);
      child._setParent(map);
      map.#map.set(crdt.parentKey, child);
    }

    return map;
  }

  /**
   * INTERNAL 
   */
  _attach(
    id: string,
    doc: Doc
  ) {
    super._attach(id, doc);

    for (const [key, value] of this.#map) {
      if (isCrdt(value)) {
        value._attach(doc.generateId(), doc)
      }
    }
  }

  /**
   * INTERNAL 
   */
  _attachChild(id: string, key: TKey, child: AbstractCrdt) {
    if(this._doc == null) {
      throw new Error("Can't attach child if doc is not present")
    }

    const previousValue = this.#map.get(key);
    if (previousValue) {
      previousValue._detach();
    }

    child._setParent(this);
    child._attach(id, this._doc);
    this.#map.set(key, child);
    this.notify();
  }

  /**
   * INTERNAL 
   */
  _detach() {
    super._detach()

    for(const item of this.#map.values()) {
      item._detach();
    }
  }

  /**
   * INTERNAL 
   */
  _detachChild(child: AbstractCrdt) {
    for (const [key, value] of this.#map) {
      if (value === (child as any)) {
        this.#map.delete(key);
      }
    }

    child._detach();
    this.notify();
  }

  get(key: TKey): TValue | undefined {
    const value = this.#map.get(key);
    if (value == undefined) {
      return undefined;
    }
    return selfOrRegisterValue(value);
  }

  set(key: TKey, value: TValue) {
    const oldValue = this.#map.get(key);
    
    if (oldValue) {
      oldValue._detach();
    }
    
    const item = selfOrRegister(value);
    item._setParent(this);

    this.#map.set(key, item);

    if(this._doc && this._id) {
      item._attach(this._doc.generateId(), this._doc);
      const ops = item._serialize(this._id, key);
      this._doc.dispatch(ops);
    }

    this.notify();
  }

  get size() {
    return this.#map.size;
  }

  has(key: TKey): boolean {
    return this.#map.has(key);
  }

  delete(key: TKey): boolean {
    const item = this.#map.get(key);

    if(item == null) {
      return false;
    }

    item._detach();

    if(this._doc && item._id) {
      this._doc.dispatch([{ type: OpType.DeleteCrdt, id: item._id }]);
    }

    this.#map.delete(key);
    this.notify();
    return true;
  }

  entries(): IterableIterator<[string, TValue]> {
    const innerIterator = this.#map.entries();

    return {
      [Symbol.iterator]: function () {
        return this;
      },
      next() {
        const iteratorValue = innerIterator.next();

        if (iteratorValue.done) {
          return {
            done: true,
            value: undefined,
          };
        }

        const entry = iteratorValue.value;

        return {
          value: [entry[0], selfOrRegisterValue(iteratorValue.value[1])],
        };
      },
    };
  }

  [Symbol.iterator](): IterableIterator<[string, TValue]> {
    return this.entries();
  }

  keys(): IterableIterator<TKey> {
    return this.#map.keys();
  }

  values(): IterableIterator<TValue> {
    const innerIterator = this.#map.values();

    return {
      [Symbol.iterator]: function () {
        return this;
      },
      next() {
        const iteratorValue = innerIterator.next();

        if (iteratorValue.done) {
          return {
            done: true,
            value: undefined,
          };
        }

        return {
          value: selfOrRegisterValue(iteratorValue.value),
        };
      },
    };
  }

  forEach(
    callback: (value: TValue, key: TKey, map: LiveMap<TKey, TValue>) => void
  ) {
    for (const entry of this) {
      callback(entry[1], entry[0] as TKey, this);
    }
  }
}

class LiveRegister<TValue = any> extends AbstractCrdt {
  #data: TValue;

  constructor(data: TValue) {
    super();
    this.#data = data;
  }

  get data() {
    return this.#data;
  }

  /**
   * INTERNAL 
   */
  static _deserialize(
    [id, item]: SerializedCrdtWithId,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    if (item.type !== CrdtType.Register) {
      throw new Error(
        `Tried to deserialize a map but item type is "${item.type}"`
      );
    }

    const register = new LiveRegister(item.data);
    register._attach(id, doc);
    return register;
  }

  /**
   * INTERNAL 
   */
  _serialize(parentId: string, parentKey: string): Op[] {
    if(this._id == null || parentId == null || parentKey == null) {
      throw new Error("Cannot serialize register if parentId or parentKey is undefined")
    }

    return [{
      type: OpType.CreateRegister,
      id: this._id,
      parentId,
      parentKey,
      data: this.data
    }]
  }

  _attachChild(id: string, key: string, crdt: AbstractCrdt): void {
    throw new Error("Method not implemented.");
  }

  _detachChild(crdt: AbstractCrdt): void {
    throw new Error("Method not implemented.");
  }
}

type LiveListItem = [crdt: AbstractCrdt, position: string];

export class LiveList<T> extends AbstractCrdt {
  // TODO: Naive array at first, find a better data structure
  #items: Array<LiveListItem> = [];

  constructor(items: T[] = []) {
    super();
    let position = undefined;
    for (let i = 0; i < items.length; i++) {
      const newPosition = makePosition(position);
      const item = selfOrRegister(items[i]);
      this.#items.push([item, newPosition]);
      position = newPosition;
    }
  }

  /**
   * INTERNAL 
   */
  static _deserialize(
    [id, item]: [id: string, item: SerializedList],
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

      child._setParent(list);

      list.#items.push([child, entry[1].parentKey!]);
      list.#items.sort((itemA, itemB) =>
        compare({ position: itemA[1] }, { position: itemB[1] })
      );
    }

    return list;
  }

  /**
   * INTERNAL 
   */
  _serialize(parentId?: string, parentKey?: string): Op[] {
    if(this._id == null) {
      throw new Error("Cannot serialize item is not attached")
    }

    if(parentId == null || parentKey == null) {
      throw new Error("Cannot serialize list if parentId or parentKey is undefined")
    }

    
    const ops = [];
    const op: CreateListOp = {
      id: this._id,
      type: OpType.CreateList,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const [value, key] of this.#items) {
      ops.push(...value._serialize(this._id, key));
    }

    return ops;
  }

  /**
   * INTERNAL 
   */
  _attach(
    id: string,
    doc: Doc,
  ) {
    super._attach(id, doc);


    for (const [item, position] of this.#items) {
      item._attach(doc.generateId(), doc)
    }

  }

  /**
   * INTERNAL 
   */
  _detach() {
    super._detach();

    for(const [value] of this.#items) {
      value._detach();
    }
  }

  /**
   * INTERNAL 
   */
  _attachChild(id: string, key: string, child: AbstractCrdt) {
    if(this._doc == null) {
      throw new Error("Can't attach child if doc is not present")
    }

    child._attach(id, this._doc);
    child._setParent(this);
    
    // TODO: Handle list conflict
    this.#items.push([child, key]);
    this.#items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  /**
   * INTERNAL 
   */
  _detachChild(child: AbstractCrdt) {
    const indexToDelete = this.#items.findIndex((item) => item[0] === child);
    this.#items.splice(indexToDelete, 1);
    if (child) {
      child._detach();
    }
    this.notify();
  }

  /**
   * INTERNAL 
   */
  _setChildKey(key: string, child: AbstractCrdt) {
    const item = this.#items.find((item) => item[0] === child);
    if (item) {
      item[1] = key;
    }
    this.#items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  push(item: T) {
    const position =
      this.#items.length === 0
        ? makePosition()
        : makePosition(this.#items[this.#items.length - 1][1]);

    const value = selfOrRegister(item);
    value._setParent(this);
    this.#items.push([value, position]);
    this.notify();

    if (this._doc && this._id) {
      value._attach(
        this._doc.generateId(),
        this._doc
      );
      this._doc.dispatch(value._serialize(this._id, position));
    }
  }

  insert(item: T, index: number) {
    if (index < 0 || index > this.#items.length) {
      throw new Error(
        `Cannot delete list item at index "${index}". index should be between 0 and ${this.#items.length}`
      );
    }

    let before = this.#items[index - 1] ? this.#items[index - 1][1] : undefined;
    let after = this.#items[index] ? this.#items[index][1] : undefined;
    const position = makePosition(before, after);

    const value = selfOrRegister(item);
    value._setParent(this);

    this.#items.push([value, position]);
    this.#items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    this.notify();

    if (this._doc && this._id) {
      value._attach(
        this._doc.generateId(),
        this._doc
      );
      this._doc.dispatch(value._serialize(this._id, position));
    }
  }

  move(index: number, targetIndex: number) {
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
          : this.#items[targetIndex + 1][1];
      beforePosition = this.#items[targetIndex][1];
    } else {
      afterPosition = this.#items[targetIndex][1];
      beforePosition =
        targetIndex === 0 ? undefined : this.#items[targetIndex - 1][1];
    }

    const position = makePosition(beforePosition, afterPosition);

    const item = this.#items[index];
    item[1] = position;
    this.#items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    this.notify();

    if (this._doc && this._id) {
      this._doc.dispatch([{
        type: OpType.SetParentKey,
        id: item[0]._id!,
        parentKey: position,
      },]);
    }
  }

  delete(index: number) {
    if (index < 0 || index >= this.#items.length) {
      throw new Error(
        `Cannot delete list item at index "${index}". index should be between 0 and ${
          this.#items.length - 1
        }`
      );
    }

    const item = this.#items[index];
    item[0]._detach();
    this.#items.splice(index, 1);

    if (this._doc) {
      const childRecordId = item[0]._id;
      if(childRecordId) {
        this._doc.dispatch([
          {
            id: childRecordId,
            type: OpType.DeleteCrdt,
          },
        ]);
      }
    }

    this.notify();
  }

  toArray(): T[] {
    return this.#items.map((entry) => selfOrRegisterValue(entry[0]));
  }

  every(predicate: (value: T, index: number) => unknown): boolean {
    return this.toArray().every(predicate);
  }

  filter(predicate: (value: T, index: number) => unknown): T[] {
    return this.toArray().filter(predicate);
  }

  find(predicate: (value: T, index: number) => unknown): T | undefined {
    return this.toArray().find(predicate);
  }

  findIndex(predicate: (value: T, index: number) => unknown): number {
    return this.toArray().findIndex(predicate);
  }

  forEach(callbackfn: (value: T, index: number) => void): void {
    return this.toArray().forEach(callbackfn);
  }

  get(index: number): T {
    return selfOrRegisterValue(this.#items[index][0]);
  }

  indexOf(searchElement: T, fromIndex?: number): number {
    return this.toArray().indexOf(searchElement, fromIndex);
  }

  lastIndexOf(searchElement: T, fromIndex?: number): number {
    return this.toArray().lastIndexOf(searchElement, fromIndex);
  }

  map<U>(callback: (value: T, index: number) => U): U[] {
    return this.#items.map((entry, i) => callback(selfOrRegisterValue(entry[0]), i));
  }

  some(predicate: (value: T, index: number) => unknown): boolean {
    return this.toArray().some(predicate);
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new LiveListIterator(this.#items);
  }
}

class LiveListIterator<T> implements IterableIterator<T> {
  #innerIterator: IterableIterator<LiveListItem>;

  constructor(items: Array<LiveListItem>) {
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

    return {
      value: selfOrRegisterValue(result.value[0]),
    }
  }
}

function deserialize(
  entry: SerializedCrdtWithId,
  parentToChildren: Map<string, SerializedCrdtWithId[]>,
  doc: Doc
): AbstractCrdt {
  switch (entry[1].type) {
    case CrdtType.Object: {
      return LiveObject._deserialize(entry, parentToChildren, doc);
    }
    case CrdtType.List: {
      return LiveList._deserialize(
        entry as [string, SerializedList],
        parentToChildren,
        doc
      );
    }
    case CrdtType.Map: {
      return LiveMap._deserialize(
        entry as [string, SerializedMap],
        parentToChildren,
        doc
      );
    }
    case CrdtType.Register: {
      return LiveRegister._deserialize(
        entry as [string, SerializedMap],
        parentToChildren,
        doc
      );
    }
    default: {
      throw new Error("Unexpected CRDT type");
    }
  }
}

function isCrdt(obj: any): obj is AbstractCrdt {
  return (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList ||
    obj instanceof LiveRegister
  );
}

function selfOrRegisterValue(obj: AbstractCrdt) {
  if (obj instanceof LiveRegister) {
    return obj.data;
  }

  return obj;
}

function selfOrRegister(obj: any): AbstractCrdt {
  if (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList
  ) {
    return obj;
  } else if (obj instanceof LiveRegister) {
    throw new Error(
      "Internal error. LiveRegister should not be created from selfOrRegister"
    );
  } else {
    return new LiveRegister(obj);
  }
}
