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

const INTERNAL = Symbol("liveblocks.internal");

type Dispatch = (ops: Op[]) => void;

function noOp() {}

export class Doc<T extends Record<string, any> = Record<string, any>> {
  private _clock = 0;
  private _items = new Map<string, AbstractCrdt>();

  private constructor(
    private _root: LiveObject<T>,
    private actor: number = 0,
    private _dispatch: Dispatch = noOp
  ) {}

  static from<T>(root: T, actor: number = 0, dispatch: Dispatch = noOp) {
    const rootRecord = new LiveObject(root) as LiveObject<T>;
    const storage = new Doc(rootRecord, actor, dispatch) as Doc<T>;
    rootRecord.attach(storage.generateId(), storage);
    storage.dispatch(rootRecord.serialize());
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
    doc._root = LiveObject.deserialize(
      root,
      parentToChildren,
      doc
    ) as LiveObject<T>;
    return doc;
  }

  dispatch(ops: Op[]) {
    this._dispatch(ops);
  }

  addItem(id: string, item: AbstractCrdt) {
    this._items.set(id, item);
  }

  deleteItem(id: string) {
    this._items.delete(id);
  }

  getItem(id: string) {
    return this._items.get(id);
  }

  apply(op: Op) {
    switch (op.type) {
      case OpType.UpdateObject: {
        this.applyUpdateRecord(op);
        break;
      }
      case OpType.CreateObject: {
        this.applyCreateObject(op);
        break;
      }
      case OpType.CreateMap: {
        this.applyCreateMap(op);
        break;
      }
      case OpType.CreateList: {
        this.applyCreateList(op);
        break;
      }
      case OpType.DeleteCrdt: {
        this.applyDeleteRecord(op);
        break;
      }
      case OpType.SetParentKey: {
        this.applySetParentKey(op);
        break;
      }
      case OpType.DeleteObjectKey: {
        this.applyDeleteRecordKey(op);
        break;
      }
      case OpType.CreateRegister: {
        this.applyCreateRegister(op);
        break;
      }
    }
  }

  private applyCreateRegister(op: CreateRegisterOp) {
    const parent = this._items.get(op.parentId);

    if (parent == null) {
      return;
    }

    if (!(parent instanceof LiveMap) && !(parent instanceof LiveList)) {
      throw new Error(
        "LiveRegister can only be attached to a LiveMap or LiveList"
      );
    }

    const newRegister = new LiveRegister(op.data);
    parent.attachChild(op.id, op.parentKey, newRegister);
  }

  private applyDeleteRecordKey(op: DeleteObjectKeyOp) {
    const item = this._items.get(op.id);
    if (item && item instanceof LiveObject) {
      item.apply(op);
    }
  }

  private applyUpdateRecord(op: UpdateObjectOp) {
    const item = this._items.get(op.id);
    if (item && item instanceof LiveObject) {
      item.apply(op);
    }
  }

  private applyCreateMap(op: CreateMapOp) {
    const parent = this._items.get(op.parentId);
    if (parent == null) {
      return;
    }

    const newMap = new LiveMap();
    parent.attachChild(op.id, op.parentKey, newMap);
  }

  private applyCreateList(op: CreateListOp) {
    const parent = this._items.get(op.parentId);
    if (parent == null) {
      return;
    }

    const list = new LiveList();
    parent.attachChild(op.id, op.parentKey, list);
  }

  private applyCreateObject(op: CreateObjectOp) {
    if (op.parentId && op.parentKey) {
      const parent = this._items.get(op.parentId);
      if (parent == null) {
        return;
      }
      
      const newObj = new LiveObject(op.data);
      parent.attachChild(op.id, op.parentKey, newObj);
    }
  }

  private applyDeleteRecord(op: DeleteCrdtOp) {
    const item = this._items.get(op.id);

    if (item == null) {
      return;
    }

    const parent = item.parent;

    if (parent == null) {
      return;
    }

    if (parent) {
      parent.detachChild(item);
    }
  }

  private applySetParentKey(op: SetParentKeyOp) {
    const item = this._items.get(op.id);

    if (item == null) {
      return;
    }

    if (item.parent == null) {
      return;
    }

    if (item.parent instanceof LiveList) {
      item.parent.setChildKey(op.parentKey, item);
    }
  }

  get root(): LiveObject<T> {
    return this._root;
  }

  count() {
    return this._items.size;
  }

  generateId() {
    return `${this.actor}:${this._clock++}`;
  }
}

class AbstractCrdt {
  private _listeners: Array<() => void> = [];
  private _deepListeners: Array<() => void> = [];

  #parent?: AbstractCrdt;
  #doc?: Doc;
  #id?: string;

  protected get doc() {
    return this.#doc;
  }

  get id() {
    return this.#id;
  }

  get parent() {
    return this.#parent;
  }

  setParent(parent: AbstractCrdt) {
    if(this.#parent) {
      throw new Error("Cannot attach parent if it already exist");
    }

    this.#parent = parent;
  }

  attach(id: string, doc: Doc) {
    if(this.#id || this.#doc) {
      throw new Error("Cannot attach if CRDT is already attached");
    }

    doc.addItem(id, this);

    this.#id = id;
    this.#doc = doc;
  }

  attachChild(id: string, key: string, crdt: AbstractCrdt) {
    throw new Error("attachChild should be implement by a non abstract CRDT");
  }

  detach() {
    if(this.#doc && this.#id) {
      this.#doc.deleteItem(this.#id)
    }

    this.#parent = undefined;
    this.#doc = undefined;
  }

  detachChild(crdt: AbstractCrdt) {
    throw new Error("detach child should be implement by a non abstract CRDT");
  }

  subscribe(listener: () => void) {
    this._listeners.push(listener);
  }

  subscribeDeep(listener: () => void) {
    this._deepListeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    remove(this._listeners, listener);
  }

  unsubscribeDeep(listener: () => void) {
    remove(this._deepListeners, listener);
  }

  notify(onlyDeep = false) {
    if(onlyDeep === false) {
      for (const listener of this._listeners) {
        listener();
      }
    }

    for (const listener of this._deepListeners) {
      listener();
    }

    if(this.parent) {
      this.parent.notify(true);
    }
  }

  serialize(parentId: string, parentKey: string): Op[] {
    throw new Error("serialize should be implement by a non abstract CRDT");
  }
}


export class LiveObject<T extends Record<string, any> = Record<string, any>> extends AbstractCrdt {
  private _map: Map<string, any>;

  constructor(object: T = {} as T) {
    super();

    for(const key in object) {
      const value = object[key] as any;
      if(value instanceof AbstractCrdt) {
        value.setParent(this);
      }
    }

    this._map = new Map(Object.entries(object));
  }

  /**
   * INTERNAL 
   */
  serialize(parentId?: string, parentKey?: string): Op[] {
    if(this.id == null) {
      throw new Error("Cannot serialize item is not attached")
    }

    const ops = [];
    const op: CreateObjectOp = {
      id: this.id,
      type: OpType.CreateObject,
      parentId,
      parentKey,
      data: {}
    };

    ops.push(op);

    for (const [key, value] of this._map) {
      if (value instanceof AbstractCrdt) {
        ops.push(...value.serialize(this.id, key))
      } else {
        op.data[key] = value;
      }
    }

    return ops;
  }

  static deserialize(
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
    object.attach(id, doc);

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
      child.setParent(object);
      object._map.set(crdt.parentKey, child);
    }

    return object;
  }

  attach(
    id: string,
    doc: Doc,
  ) {
    super.attach(id, doc);
    
    for (const [key, value] of this._map) {
      if (value instanceof AbstractCrdt) {
        value.attach(doc.generateId(), doc);
      }
    }
  }

  attachChild(id: string, key: keyof T, child: AbstractCrdt) {
    if(this.doc == null) {
      throw new Error("Can't attach child if doc is not present")
    }

    const previousValue = this._map.get(key as string);
    if (isCrdt(previousValue)) {
      previousValue.detach();
    }

    this._map.set(key as string, child);
    child.setParent(this);
    child.attach(id, this.doc);
    this.notify();
  }

  detachChild(child: AbstractCrdt) {
    for (const [key, value] of this._map) {
      if (value === child) {
        this._map.delete(key);
      }
    }

    if (child) {
      child.detach();
    }

    this.notify();
  }

  detach() {
    super.detach();

    for(const value of this._map.values()) {
      if(isCrdt(value)) {
        value.detach();
      }
    }
  }

  /**
   * INTERNAL
   */
  apply(op: Op) {
    if (op.type === OpType.UpdateObject) {
      for (const key in op.data as Partial<T>) {
        const oldValue = this._map.get(key);

        if (isCrdt(oldValue)) {
          oldValue.detach();
        }

        const value = op.data[key];
        this._map.set(key, value);
      }
      this.notify();
    } else if (op.type === OpType.DeleteObjectKey) {
      const key = op.key;
      const oldValue = this._map.get(key);

      if (isCrdt(oldValue)) {
        oldValue.detach();
      }

      this._map.delete(key);
      this.notify();
    }
  }

  toObject(): T {
    return Object.fromEntries(this._map) as T;
  }

  set<TKey extends keyof T>(key: TKey, value: T[TKey]) {
    // TODO: Find out why typescript complains
    this.update({ [key]: value } as any as Partial<T>);
  }

  get<TKey extends keyof T>(key: TKey): T[TKey] {
    return this._map.get(key as string);
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
    if(this.doc && this.id) {
      const ops = [];
      const updateOp: UpdateObjectOp = {
        id: this.id,
        type: OpType.UpdateObject,
        data: { }
      };
      ops.push(updateOp);

      for (const key in overrides) {
        const oldValue = this._map.get(key);
  
        if(oldValue instanceof LiveObject) {
          oldValue.detach();
        }
  
        const newValue = overrides[key] as any;
  
        if(newValue instanceof AbstractCrdt) {
          newValue.setParent(this);
          newValue.attach(this.doc.generateId(), this.doc);
          ops.push(...newValue.serialize(this.id, key));
        } else {
          updateOp.data[key] = newValue;
        }
  
        this._map.set(key, newValue);
      }

      this.doc.dispatch(ops);
      this.notify();

      return;
    }
    
    for (const key in overrides) {
      const oldValue = this._map.get(key);

      if(oldValue instanceof AbstractCrdt) {
        oldValue.detach();
      }

      const newValue = overrides[key] as any;

      if(newValue instanceof AbstractCrdt) {
        newValue.setParent(this);
      }

      this._map.set(key, newValue);
    }

    this.notify();
  }
}

export class LiveMap<TKey extends string, TValue>
  extends AbstractCrdt
{
  private _map: Map<TKey, AbstractCrdt>;

  constructor(
    entries?: readonly (readonly [TKey, TValue])[] | null | undefined
  ) {
    super();
    if (entries) {
      const mappedEntries: Array<[TKey,AbstractCrdt]> = [];
      for(const entry of entries) {
        const value = selfOrRegister(entry[1]);
        value.setParent(this);
        mappedEntries.push([entry[0], value]);
      }

      this._map = new Map(
        mappedEntries
      );
    } else {
      this._map = new Map();
    }
  }

  serialize(parentId?: string, parentKey?: string): Op[] {
    if(this.id == null) {
      throw new Error("Cannot serialize item is not attached")
    }

    if(parentId == null || parentKey == null) {
      throw new Error("Cannot serialize map if parentId or parentKey is undefined")
    }

    const ops = [];
    const op: CreateMapOp = {
      id: this.id,
      type: OpType.CreateMap,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const [key, value] of this._map) {
      ops.push(...value.serialize(this.id, key));
    }

    return ops;
  }

  static deserialize(
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
    map.attach(id, doc);

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
      child.setParent(map);
      map._map.set(crdt.parentKey, child);
    }

    return map;
  }

  private apply(op: Op) {}

  attach(
    id: string,
    doc: Doc
  ) {
    super.attach(id, doc);

    for (const [key, value] of this._map) {
      if (isCrdt(value)) {
        value.attach(doc.generateId(), doc)
      }
    }
  }

  attachChild(id: string, key: TKey, child: AbstractCrdt) {
    if(this.doc == null) {
      throw new Error("Can't attach child if doc is not present")
    }

    const previousValue = this._map.get(key);
    if (previousValue) {
      previousValue.detach();
    }

    child.setParent(this);
    child.attach(id, this.doc);
    this._map.set(key, child);
    this.notify();
  }

  detach() {
    super.detach()

    for(const item of this._map.values()) {
      item.detach();
    }
  }

  detachChild(child: AbstractCrdt) {
    for (const [key, value] of this._map) {
      if (value === (child as any)) {
        this._map.delete(key);
      }
    }

    child.detach();
    this.notify();
  }

  get(key: TKey): TValue | undefined {
    const value = this._map.get(key);
    if (value == undefined) {
      return undefined;
    }
    return selfOrRegisterValue(value);
  }

  set(key: TKey, value: TValue) {
    const oldValue = this._map.get(key);
    
    if (oldValue) {
      oldValue.detach();
    }
    
    const item = selfOrRegister(value);
    item.setParent(this);

    this._map.set(key, item);

    if(this.doc && this.id) {
      item.attach(this.doc.generateId(), this.doc);
      const ops = item.serialize(this.id, key);
      this.doc.dispatch(ops);
    }

    this.notify();
  }

  get size() {
    return this._map.size;
  }

  has(key: TKey): boolean {
    return this._map.has(key);
  }

  delete(key: TKey): boolean {
    const item = this._map.get(key);

    if(item == null) {
      return false;
    }

    item.detach();

    if(this.doc && item.id) {
      this.doc.dispatch([{ type: OpType.DeleteCrdt, id: item.id }]);
    }

    this._map.delete(key);
    this.notify();
    return true;
  }

  entries(): IterableIterator<[string, TValue]> {
    const innerIterator = this._map.entries();

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
    return this._map.keys();
  }

  values(): IterableIterator<TValue> {
    const innerIterator = this._map.values();

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
  private _data: TValue;

  constructor(data: TValue) {
    super();
    this._data = data;
  }

  get data() {
    return this._data;
  }

  static deserialize(
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
    register.attach(id, doc);
    return register;
  }

  serialize(parentId: string, parentKey: string): Op[] {
    if(this.id == null || parentId == null || parentKey == null) {
      throw new Error("Cannot serialize register if parentId or parentKey is undefined")
    }

    return [{
      type: OpType.CreateRegister,
      id: this.id,
      parentId,
      parentKey,
      data: this.data
    }]
  }
}

type LiveListItem = [crdt: AbstractCrdt, position: string];

export class LiveList<T> extends AbstractCrdt {
  // TODO: Naive array at first, find a better data structure
  private _items: Array<LiveListItem> = [];

  constructor(items: T[] = []) {
    super();
    let position = undefined;
    for (let i = 0; i < items.length; i++) {
      const newPosition = makePosition(position);
      const item = selfOrRegister(items[i]);
      this._items.push([item, newPosition]);
      position = newPosition;
    }
  }

  static deserialize(
    [id, item]: [id: string, item: SerializedList],
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Doc
  ) {
    const list = new LiveList([]);
    list.attach(id, doc);

    const children = parentToChildren.get(id);

    if (children == null) {
      return list;
    }

    for (const entry of children) {
      const child = deserialize(entry, parentToChildren, doc);

      child.setParent(list);

      list._items.push([child, entry[1].parentKey!]);
      list._items.sort((itemA, itemB) =>
        compare({ position: itemA[1] }, { position: itemB[1] })
      );
    }

    return list;
  }

  serialize(parentId?: string, parentKey?: string): Op[] {
    if(this.id == null) {
      throw new Error("Cannot serialize item is not attached")
    }

    if(parentId == null || parentKey == null) {
      throw new Error("Cannot serialize list if parentId or parentKey is undefined")
    }

    
    const ops = [];
    const op: CreateListOp = {
      id: this.id,
      type: OpType.CreateList,
      parentId,
      parentKey,
    };

    ops.push(op);

    for (const [value, key] of this._items) {
      ops.push(...value.serialize(this.id, key));
    }

    return ops;
  }

  attach(
    id: string,
    doc: Doc,
  ) {
    super.attach(id, doc);


    for (const [item, position] of this._items) {
      item.attach(doc.generateId(), doc)
    }

  }

  detach() {
    super.detach();

    for(const [value] of this._items) {
      value.detach();
    }
  }

  attachChild(id: string, key: string, child: AbstractCrdt) {
    if(this.doc == null) {
      throw new Error("Can't attach child if doc is not present")
    }

    child.attach(id, this.doc);
    child.setParent(this);
    
    // TODO: Handle list conflict
    this._items.push([child, key]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  detachChild(child: AbstractCrdt) {
    const indexToDelete = this._items.findIndex((item) => item[0] === child);
    this._items.splice(indexToDelete, 1);
    if (child) {
      child.detach();
    }
    this.notify();
  }

  setChildKey(key: string, child: AbstractCrdt) {
    const item = this._items.find((item) => item[0] === child);
    if (item) {
      item[1] = key;
    }
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  private apply(op: Op) {}

  push(item: T) {
    const position =
      this._items.length === 0
        ? makePosition()
        : makePosition(this._items[this._items.length - 1][1]);

    const value = selfOrRegister(item);
    value.setParent(this);
    this._items.push([value, position]);
    this.notify();

    if (this.doc && this.id) {
      value.attach(
        this.doc.generateId(),
        this.doc
      );
      this.doc.dispatch(value.serialize(this.id, position));
    }
  }

  insert(item: T, index: number) {
    if (index < 0 || index > this._items.length) {
      throw new Error(
        `Cannot delete list item at index "${index}". index should be between 0 and ${this._items.length}`
      );
    }

    let before = this._items[index - 1] ? this._items[index - 1][1] : undefined;
    let after = this._items[index] ? this._items[index][1] : undefined;
    const position = makePosition(before, after);

    const value = selfOrRegister(item);
    value.setParent(this);

    this._items.push([value, position]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    this.notify();

    if (this.doc && this.id) {
      value.attach(
        this.doc.generateId(),
        this.doc
      );
      this.doc.dispatch(value.serialize(this.id, position));
    }
  }

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
          : this._items[targetIndex + 1][1];
      beforePosition = this._items[targetIndex][1];
    } else {
      afterPosition = this._items[targetIndex][1];
      beforePosition =
        targetIndex === 0 ? undefined : this._items[targetIndex - 1][1];
    }

    const position = makePosition(beforePosition, afterPosition);

    const item = this._items[index];
    item[1] = position;
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    this.notify();

    if (this.doc && this.id) {
      this.doc.dispatch([{
        type: OpType.SetParentKey,
        id: item[0].id!,
        parentKey: position,
      },]);
    }
  }

  delete(index: number) {
    if (index < 0 || index >= this._items.length) {
      throw new Error(
        `Cannot delete list item at index "${index}". index should be between 0 and ${
          this._items.length - 1
        }`
      );
    }

    const item = this._items[index];
    item[0].detach();
    this._items.splice(index, 1);

    if (this.doc) {
      const childRecordId = item[0].id;
      if(childRecordId) {
        this.doc.dispatch([
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
    return this._items.map((entry) => selfOrRegisterValue(entry[0]));
  }

  get(index: number): T {
    return selfOrRegisterValue(this._items[index][0]);
  }
}

function deserialize(
  entry: SerializedCrdtWithId,
  parentToChildren: Map<string, SerializedCrdtWithId[]>,
  doc: Doc
): AbstractCrdt {
  switch (entry[1].type) {
    case CrdtType.Object: {
      return LiveObject.deserialize(entry, parentToChildren, doc);
    }
    case CrdtType.List: {
      return LiveList.deserialize(
        entry as [string, SerializedList],
        parentToChildren,
        doc
      );
    }
    case CrdtType.Map: {
      return LiveMap.deserialize(
        entry as [string, SerializedMap],
        parentToChildren,
        doc
      );
    }
    case CrdtType.Register: {
      return LiveRegister.deserialize(
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
