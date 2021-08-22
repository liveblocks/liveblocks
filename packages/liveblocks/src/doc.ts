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

interface ICrdt {
  readonly [INTERNAL]: {
    getId(): string | undefined;
    getParentId(): string | undefined;
    attach(id: string, doc: Doc, parentId?: string, parentKey?: string): Op[];
    attachChild(key: any, child: ICrdt): void;
    detach(): void;
    detachChild(child: ICrdt): void;
  };
}

export class Doc<T extends Record<string, any> = Record<string, any>> {
  private _clock = 0;
  private _items = new Map<string, ICrdt>();

  private constructor(
    private _root: LiveObject<T>,
    private actor: number = 0,
    private _dispatch: Dispatch = noOp
  ) {}

  static from<T>(root: T, actor: number = 0, dispatch: Dispatch = noOp) {
    const rootRecord = new LiveObject(root) as LiveObject<T>;
    const storage = new Doc(rootRecord, actor, dispatch) as Doc<T>;
    const ops = rootRecord[INTERNAL].attach(storage.generateId(), storage);
    storage.dispatch(ops);
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

  addItem(id: string, item: ICrdt) {
    this._items.set(id, item);
  }

  deleteItem(id: string) {
    this._items.delete(id);
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
    const newRegister = new LiveRegister(op.data);
    newRegister[INTERNAL].attach(op.id, this, op.parentId, op.parentKey);
    const parent = this._items.get(op.parentId);

    if (parent == null) {
      return;
    }

    if (!(parent instanceof LiveMap) && !(parent instanceof LiveList)) {
      throw new Error(
        "LiveRegister can only be attached to a LiveMap or LiveList"
      );
    }

    parent[INTERNAL].attachChild(op.parentKey, newRegister);
  }

  private applyDeleteRecordKey(op: DeleteObjectKeyOp) {
    const item = this._items.get(op.id);
    if (item && item instanceof LiveObject) {
      item[INTERNAL].apply(op);
    }
  }

  private applyUpdateRecord(op: UpdateObjectOp) {
    const item = this._items.get(op.id);
    if (item && item instanceof LiveObject) {
      item[INTERNAL].apply(op);
    }
  }

  private applyCreateMap(op: CreateMapOp) {
    const parent = this._items.get(op.parentId);
    if (parent == null) {
      return;
    }

    const newMap = new LiveMap();
    newMap[INTERNAL].attach(op.id, this, op.parentId, op.parentKey);
    parent[INTERNAL].attachChild(op.parentKey, newMap);
  }

  private applyCreateList(op: CreateListOp) {
    const parent = this._items.get(op.parentId);
    if (parent == null) {
      return;
    }

    const newMap = new LiveList();
    newMap[INTERNAL].attach(op.id, this, op.parentId, op.parentKey);
    parent[INTERNAL].attachChild(op.parentKey, newMap);
  }

  private applyCreateObject(op: CreateObjectOp) {
    const newObj = new LiveObject(op.data);
    newObj[INTERNAL].attach(op.id, this, op.parentId, op.parentKey);

    if (op.parentId && op.parentKey) {
      const parent = this._items.get(op.parentId);
      if (parent == null) {
        return;
      }

      parent[INTERNAL].attachChild(op.parentKey, newObj);
    }
  }

  private applyDeleteRecord(op: DeleteCrdtOp) {
    const item = this._items.get(op.id);

    if (item == null) {
      return;
    }

    const parentId = item[INTERNAL].getParentId();

    if (parentId == null) {
      return;
    }

    const parent = this._items.get(parentId);

    if (parent) {
      parent[INTERNAL].detachChild(item);
    }
  }

  private applySetParentKey(op: SetParentKeyOp) {
    const item = this._items.get(op.id);

    if (item == null) {
      return;
    }

    const parentId = item[INTERNAL].getParentId();

    if (parentId == null) {
      return;
    }

    const parent = this._items.get(parentId);

    if (parent && parent instanceof LiveList) {
      parent[INTERNAL].setChildKey(op.parentKey, item);
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

export class LiveObject<T extends Record<string, any> = Record<string, any>> {
  private _map: Map<string, any>;
  private _listeners: Array<() => void> = [];
  private _ctx?: {
    id: string;
    doc: Doc;
    parentId?: string;
  };

  constructor(object: T = {} as T) {
    this._map = new Map(Object.entries(object));
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

    const record = new LiveObject(item.data);
    record.attach(id, doc, item.parentId, item.parentKey);

    const children = parentToChildren.get(id);

    if (children == null) {
      return record;
    }

    for (const entry of children) {
      const crdt = entry[1];
      if (crdt.parentKey == null) {
        throw new Error(
          "Tried to deserialize a crdt but it does not have a parentKey and is not the root"
        );
      }

      const child = deserialize(entry, parentToChildren, doc);
      record._map.set(crdt.parentKey, child);
    }

    return record;
  }

  get [INTERNAL]() {
    return {
      ctx: this._ctx,
      attachChild: this.attachChild.bind(this),
      detachChild: this.detachChild.bind(this),
      detach: this.detach.bind(this),
      attach: this.attach.bind(this),
      apply: this.apply.bind(this),
      getParentId: this._getParentId.bind(this),
      getId: this._getId.bind(this),
    };
  }

  private _getParentId() {
    return this._ctx?.parentId;
  }

  private _getId() {
    return this._ctx?.id;
  }

  private attach(
    id: string,
    doc: Doc,
    parentId?: string,
    parentKey?: string
  ): Op[] {
    if (this._ctx) {
      throw new Error("LiveObject is already part of the storage");
    }

    doc.addItem(id, this);

    this._ctx = {
      id,
      doc: doc,
      parentId,
    };

    const ops: Op[] = [];
    const createOp: CreateObjectOp = {
      id: this._ctx.id,
      type: OpType.CreateObject,
      parentId,
      parentKey,
      data: {},
    };
    ops.push(createOp);

    for (const [key, value] of this._map) {
      if (isCrdt(value)) {
        ops.push(...value[INTERNAL].attach(doc.generateId(), doc, this._ctx.id, key));
      } else {
        createOp.data[key] = value;
      }
    }

    return ops;
  }

  private attachChild(key: keyof T, child: ICrdt) {
    const previousValue = this._map.get(key as string);
    if (isCrdt(previousValue)) {
      previousValue[INTERNAL].detach();
    }

    this._map.set(key as string, child);
    this.notify();
  }

  private detachChild(child: ICrdt) {
    for (const [key, value] of this._map) {
      if (value === child) {
        this._map.delete(key);
      }
    }

    if (child) {
      child[INTERNAL].detach();
    }

    this.notify();
  }

  private detach() {
    if (this._ctx == null) {
      return;
    }

    this._ctx.doc.deleteItem(this._ctx.id);
    for(const value of this._map.values()) {
      if(isCrdt(value)) {
        value[INTERNAL].detach();
      }
    }
  }

  private apply(op: Op) {
    if (op.type === OpType.UpdateObject) {
      for (const key in op.data as Partial<T>) {
        const oldValue = this._map.get(key);

        if (isCrdt(oldValue)) {
          oldValue[INTERNAL].detach();
        }

        const value = op.data[key];
        this._map.set(key, value);
      }
      this.notify();
    } else if (op.type === OpType.DeleteObjectKey) {
      const key = op.key;
      const oldValue = this._map.get(key);

      if (isCrdt(oldValue)) {
        oldValue[INTERNAL].detach();
      }

      this._map.delete(key);
      this.notify();
    }
  }

  private notify() {
    for (const listener of this._listeners) {
      listener();
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

  delete<TKey extends keyof T>(key: TKey) {
    if (this._ctx) {
      const ops = [];
      const item = this._map.get(key as string);

      if (isCrdt(item)) {
        item[INTERNAL].detach();
      }

      this._ctx.doc.dispatch([
        { type: OpType.DeleteObjectKey, id: this._ctx.id, key: key as string },
      ]);
    }

    this._map.delete(key as string);
    this.notify();
  }

  update(overrides: Partial<T>) {
    if (this._ctx) {
      const ops = [];
      const updateOperation: UpdateObjectOp = {
        id: this._ctx.id,
        type: OpType.UpdateObject,
        data: {},
      };

      ops.push(updateOperation);

      for (const key in overrides) {
        const oldValue = this._map.get(key);

        if (isCrdt(oldValue)) {
          oldValue[INTERNAL].detach();
        }

        const value = overrides[key] as any;
        if (isCrdt(value)) {
          ops.push(
            ...value[INTERNAL].attach(
              this._ctx.doc.generateId(),
              this._ctx.doc,
              this._ctx.id,
              key
            )
          );
        } else {
          updateOperation.data[key] = value;
        }

        this._map.set(key, value);
      }

      this._ctx.doc.dispatch(ops);
      this.notify();
    } else {
      for (const key in overrides) {
        const value = overrides[key] as any;
        this._map.set(key, value);
      }
      this.notify();
    }
  }

  subscribe(listener: () => void) {
    this._listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    remove(this._listeners, listener);
  }
}

export class LiveMap<TKey extends string, TValue>
  implements ICrdt
{
  private _listeners: Array<() => void> = [];

  private _map: Map<TKey, ICrdt>;

  private _ctx?: {
    id: string;
    doc: Doc;
    parentId?: string;
  };

  constructor(
    entries?: readonly (readonly [TKey, TValue])[] | null | undefined
  ) {
    if (entries) {
      this._map = new Map(
        entries.map((entry) => [entry[0], selfOrRegister(entry[1])])
      );
    } else {
      this._map = new Map();
    }
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
    map.attach(id, doc, item.parentId, item.parentKey);

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
      map._map.set(crdt.parentKey, child);
    }

    return map;
  }

  get [INTERNAL]() {
    return {
      ctx: this._ctx,
      apply: this.apply.bind(this),
      attachChild: this.attachChild.bind(this),
      attach: this.attach.bind(this),
      detach: this.detach.bind(this),
      detachChild: this.detachChild.bind(this),
      getParentId: this._getParentId.bind(this),
      getId: this._getId.bind(this),
    };
  }

  private _getParentId() {
    return this._ctx?.parentId;
  }

  private _getId() {
    return this._ctx?.id;
  }

  private apply(op: Op) {}

  private attach(
    id: string,
    doc: Doc,
    parentId: string,
    parentKey: string
  ): Op[] {
    if (this._ctx) {
      throw new Error("LiveMap is already part of the storage");
    }

    doc.addItem(id, this);

    this._ctx = {
      id,
      doc: doc,
      parentId,
    };

    const ops: Op[] = [];
    const createOp: CreateMapOp = {
      id: this._ctx.id,
      type: OpType.CreateMap,
      parentId,
      parentKey,
    };
    ops.push(createOp);

    for (const [key, value] of this._map) {
      if (isCrdt(value)) {
        ops.push(
          ...value[INTERNAL].attach(doc.generateId(), doc, this._ctx.id, key)
        );
      }
    }

    return ops;
  }

  private attachChild(key: TKey, child: ICrdt) {
    const previousValue = this._map.get(key);
    if (previousValue) {
      previousValue[INTERNAL].detach();
    }

    this._map.set(key, child);
    this.notify();
  }

  private detach() {
    if (this._ctx == null) {
      return;
    }

    for(const item of this._map.values()) {
      item[INTERNAL].detach();
    }

    this._ctx.doc.deleteItem(this._ctx.id);
  }

  private detachChild(child: ICrdt) {
    for (const [key, value] of this._map) {
      if (value === (child as any)) {
        this._map.delete(key);
      }
    }

    child[INTERNAL].detach();
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
    if (this._ctx) {
      const ops: Op[] = [];

      const oldValue = this._map.get(key);

      if (oldValue) {
        oldValue[INTERNAL].detach();
      }

      const item = selfOrRegister(value);
      ops.push(
        ...item[INTERNAL].attach(
          this._ctx.doc.generateId(),
          this._ctx.doc,
          this._ctx.id,
          key
        )
      );
      this._map.set(key, item);
      this._ctx.doc.dispatch(ops);
      this.notify();
    } else {
      const item = selfOrRegister(value);
      this._map.set(key, item);
      this.notify();
    }
  }

  get size() {
    return this._map.size;
  }

  has(key: TKey): boolean {
    return this._map.has(key);
  }

  delete(key: TKey): boolean {
    if (this._ctx) {
      const item = this._map.get(key);

      if (item) {
        const itemId = item[INTERNAL].getId();
        if(itemId != null) {
          item[INTERNAL].detach();
          this._ctx.doc.dispatch([{ type: OpType.DeleteCrdt, id: itemId }]);
        }
      }
    }

    const isDeleted = this._map.delete(key);
    if (isDeleted) {
      this.notify();
    }
    return isDeleted;
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

  subscribe(listener: () => void) {
    this._listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    remove(this._listeners, listener);
  }

  private notify() {
    for (const listener of this._listeners) {
      listener();
    }
  }
}

function selfOrRegisterValue(obj: ICrdt) {
  if (obj instanceof LiveRegister) {
    return obj.data;
  }

  return obj;
}

function selfOrRegister(obj: any): ICrdt {
  if (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList
  ) {
    return obj;
  } else if (obj instanceof LiveRegister) {
    throw new Error(
      "Internal error. LiveRegister should not be created from LiveRegister"
    );
  } else {
    return new LiveRegister(obj);
  }
}

class LiveRegister<TValue = any> implements ICrdt {
  private _ctx?: {
    id: string;
    doc: Doc;
    parentId?: string;
  };
  private _data: TValue;

  constructor(data: TValue) {
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
    register.attach(id, doc, item.parentId, item.parentKey);
    return register;
  }

  get [INTERNAL]() {
    return {
      ctx: this._ctx,
      attach: this.attach.bind(this),
      detach: this.detach.bind(this),
      attachChild: this.attachChild.bind(this),
      detachChild: this.detachChild.bind(this),
      getParentId: this._getParentId.bind(this),
      getId: this._getId.bind(this),
    };
  }

  private _getParentId() {
    return this._ctx?.parentId;
  }

  private _getId() {
    return this._ctx?.id;
  }

  private detachChild(crdt: ICrdt) {
    throw new Error("Internal error: cannot detach CRDT on register");
  }

  private detach() {
    if (this._ctx) {
      this._ctx.doc.deleteItem(this._ctx.id);
    }
  }

  private attach(
    id: string,
    doc: Doc,
    parentId: string,
    parentKey: string
  ): Op[] {
    if (this._ctx) {
      throw new Error("LiveRegister is already part of the storage");
    }

    doc.addItem(id, this);

    this._ctx = {
      id,
      doc: doc,
      parentId,
    };

    const ops: Op[] = [];
    const createOp: CreateRegisterOp = {
      id,
      type: OpType.CreateRegister,
      parentId,
      parentKey,
      data: this._data,
    };
    ops.push(createOp);
    return ops;
  }

  private attachChild(key: any, child: ICrdt) {
    throw new Error("Cannot attach child to register");
  }
}

type LiveListItem = [crdt: ICrdt, position: string];

export class LiveList<T> implements ICrdt {
  private _listeners: Array<() => void> = [];
  private _ctx?: {
    id: string;
    parentId: string;
    doc: Doc;
  };

  // TODO: Naive array at first, find a better data structure
  private _items: Array<LiveListItem> = [];

  constructor(items: T[] = []) {
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
    list.attach(id, doc, item.parentId, item.parentKey);

    const children = parentToChildren.get(id);

    if (children == null) {
      return list;
    }

    for (const entry of children) {
      const child = deserialize(entry, parentToChildren, doc);
      list.attachChild(entry[1].parentKey!, child);
    }

    return list;
  }

  get [INTERNAL]() {
    return {
      ctx: this._ctx,
      attachChild: this.attachChild.bind(this),
      detachChild: this.detachChild.bind(this),
      attach: this.attach.bind(this),
      detach: this.detach.bind(this),
      apply: this.apply.bind(this),
      setChildKey: this.setChildKey.bind(this),
      getParentId: this._getParentId.bind(this),
      getId: this._getId.bind(this),
    };
  }

  private _getParentId() {
    return this._ctx?.parentId;
  }

  private _getId() {
    return this._ctx?.id;
  }

  private attach(
    id: string,
    doc: Doc,
    parentId: string,
    parentKey: string
  ): Op[] {
    if (this._ctx) {
      throw new Error("LiveList is already part of the storage");
    }

    doc.addItem(id, this);

    this._ctx = {
      doc: doc,
      id: id,
      parentId: parentId,
    };

    const ops: Op[] = [];

    const createOp: CreateListOp = {
      id: this._ctx.id,
      type: OpType.CreateList,
      parentId,
      parentKey,
    };

    ops.push(createOp);

    for (const [item, position] of this._items) {
      ops.push(
        ...item[INTERNAL].attach(doc.generateId(), doc, this._ctx.id, position)
      );
    }

    return ops;
  }

  private detach() {
    if (this._ctx == null) {
      return;
    }

    for(const [value] of this._items) {
      value[INTERNAL].detach();
    }

    this._ctx.doc.deleteItem(this._ctx.id);
  }

  private attachChild(key: string, child: ICrdt) {
    this._items.push([child, key]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  private detachChild(child: ICrdt) {
    const indexToDelete = this._items.findIndex((item) => item[0] === child);
    this._items.splice(indexToDelete);
    if (child) {
      child[INTERNAL].detach();
    }
    this.notify();
  }

  private setChildKey(key: string, child: ICrdt) {
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

  private notify() {
    for (const listener of this._listeners) {
      listener();
    }
  }

  push(item: T) {
    const position =
      this._items.length === 0
        ? makePosition()
        : makePosition(this._items[this._items.length - 1][1]);

    const value = selfOrRegister(item);
    this._items.push([value, position]);
    this.notify();

    if (this._ctx) {
      const ops = value[INTERNAL].attach(
        this._ctx.doc.generateId(),
        this._ctx.doc,
        this._ctx.id,
        position
      );
      this._ctx.doc.dispatch(ops);
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

    this._items.push([value, position]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    this.notify();

    if (this._ctx) {
      const ops = value[INTERNAL].attach(
        this._ctx.doc.generateId(),
        this._ctx.doc,
        this._ctx.id,
        position
      );
      this._ctx.doc.dispatch(ops);
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

    if (this._ctx) {
      const id = item[0][INTERNAL].getId();
      if (id == null) {
        throw new Error("Internal error. Cannot set parent key from ");
      }
      this._ctx.doc.dispatch([
        {
          type: OpType.SetParentKey,
          id: id,
          parentKey: position,
        },
      ]);
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
    this._items.splice(index, 1);

    if (this._ctx) {
      const childRecord = item[0] as LiveObject;
      this._ctx.doc.dispatch([
        {
          id: childRecord[INTERNAL].ctx!.id,
          type: OpType.DeleteCrdt,
        },
      ]);
      childRecord[INTERNAL].detach();
    }

    this.notify();
  }

  toArray(): T[] {
    return this._items.map((entry) => selfOrRegisterValue(entry[0]));
  }

  get(index: number): T {
    return selfOrRegisterValue(this._items[index][0]);
  }

  subscribe(listener: () => void) {
    this._listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    remove(this._listeners, listener);
  }
}

function deserialize(
  entry: SerializedCrdtWithId,
  parentToChildren: Map<string, SerializedCrdtWithId[]>,
  doc: Doc
): ICrdt {
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

function isCrdt(obj: any): obj is ICrdt {
  return (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList ||
    obj instanceof LiveRegister
  );
}
