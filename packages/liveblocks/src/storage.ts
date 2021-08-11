import { remove } from "./utils";
import {
  CrdtType,
  CreateListOp,
  CreateRecordOp,
  DeleteRecordOp,
  Op,
  OpType,
  RecordUpdateOp,
  SerializedCrdtWithId,
  SetParentKeyOp,
} from "./live";
import { compare, makePosition } from "./position";

const INTERNAL = Symbol("liveblocks.internal");

type Factories = {
  createRecord: Storage["createRecord"];
  createList: Storage["createList"];
};

type Dispatch = (ops: Op[]) => void;

function noOp() {}

type Crdt = LiveRecord | LiveList;

export type RecordData = Record<string, any>;

export class Storage<T extends RecordData = RecordData> {
  private _clock = 0;
  private _items = new Map<string, Crdt>();
  private _root: LiveRecord<T> | null = null;

  static from<T>(
    actor: number,
    factory: (factories: Factories) => T,
    _dispatch: Dispatch = noOp
  ) {
    const doc = new Storage(actor, _dispatch) as Storage<T>;
    const root = new LiveRecord(
      doc,
      `${actor}:${doc._clock++}`,
      factory({
        createRecord: doc.createRecord.bind(doc),
        createList: doc.createList.bind(doc),
      })
    ) as LiveRecord<T>;
    doc._setRoot(root);
    const ops = root[INTERNAL].serializeAsOps();
    _dispatch(ops);
    return doc;
  }

  private constructor(
    private actor: number,
    public _dispatch: Dispatch = noOp
  ) {}

  static load<T>(
    actor: number,
    items: SerializedCrdtWithId[],
    _dispatch: Dispatch = noOp
  ): Storage<T> {
    const doc = new Storage<T>(actor, _dispatch);

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

    doc._setRoot(
      LiveRecord.deserialize(root, parentToChildren, doc) as LiveRecord<T>
    );
    return doc;
  }

  addItem(id: string, item: Crdt) {
    this._items.set(id, item);
  }

  deleteItem(item: Crdt) {
    this._items.delete(item.id);
  }

  apply(op: Op) {
    switch (op.type) {
      case OpType.UpdateRecord: {
        this.applyUpdateRecord(op);
        break;
      }
      case OpType.CreateRecord: {
        this.applyCreateRecord(op);
        break;
      }
      case OpType.DeleteRecord: {
        this.applyDeleteRecord(op);
        break;
      }
      case OpType.SetParentKey: {
        this.applySetParentKey(op);
        break;
      }
    }
  }

  private applyUpdateRecord(op: RecordUpdateOp) {
    const item = this._items.get(op.id);
    if (item) {
      item[INTERNAL].apply(op);
    }
  }

  private applyCreateRecord(op: CreateRecordOp) {
    const newRecord = new LiveRecord(this, op.id, op.data, op.parentId || null);
    this._items.set(newRecord.id, newRecord);

    if (op.parentId && op.parentKey) {
      const parent = this._items.get(op.parentId);
      if (parent == null) {
        throw new Error("Parent is missing");
      }

      parent[INTERNAL].attachChild(op.parentKey, newRecord);
    }
  }

  private applyDeleteRecord(op: DeleteRecordOp) {
    const item = this._items.get(op.id);

    if (item == null) {
      return;
    }

    this._items.delete(op.id);

    if (item.parentId) {
      const parent = this._items.get(item.parentId);

      if (parent) {
        parent[INTERNAL].deleteChild(item);
      }
    }
  }

  private applySetParentKey(op: SetParentKeyOp) {
    const item = this._items.get(op.id);

    if (item == null) {
      return;
    }

    if (item.parentId) {
      const parent = this._items.get(item.parentId);

      if (parent && parent instanceof LiveList) {
        parent[INTERNAL].setChildKey(op.parentKey, item);
      }
    }
  }

  createRecord<TData extends RecordData>(data: TData): LiveRecord<TData> {
    const record = new LiveRecord(this, `${this.actor}:${this._clock++}`, data);
    this._items.set(record.id, record);
    return record;
  }

  createList<T extends LiveRecord>(items?: T[]): LiveList<T> {
    const crdt = new LiveList<T>(this, `${this.actor}:${this._clock++}`, items);
    this._items.set(crdt.id, crdt);
    return crdt;
  }

  // Chicken and egg problem because of the circular dependency. Should be set via constructor
  private _setRoot(root: LiveRecord<T>) {
    if (this._root != null) {
      throw new Error("Cannot set root if already set");
    }
    this._items.set(root.id, root);
    this._root = root;
  }

  get root(): LiveRecord<T> {
    if (this._root == null) {
      throw new Error("Cannot access root");
    }
    return this._root;
  }

  getRoot() {
    return this._root;
  }

  count() {
    return this._items.size;
  }
}

export class LiveRecord<T extends RecordData = RecordData> {
  private _listeners: Array<() => void> = [];

  constructor(
    private _doc: Storage,
    private _id: string,
    private _data: T,
    private _parentId: string | null = null
  ) {}

  static deserialize(
    [id, item]: SerializedCrdtWithId,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Storage
  ) {
    if (item.type !== CrdtType.Record) {
      throw new Error(
        `Tried to deserialize a record but item type is "${item.type}"`
      );
    }

    const record = new LiveRecord(doc, id, item.data, item.parentId);
    doc.addItem(id, record);

    const children = parentToChildren.get(record.id);

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
      record[INTERNAL].attachChild(crdt.parentKey, child);
    }

    return record;
  }

  get [INTERNAL]() {
    return {
      attachChild: this.attachChild.bind(this),
      deleteChild: this.deleteChild.bind(this),
      detach: this.detach.bind(this),
      attach: this.attach.bind(this),
      apply: this.apply.bind(this),
      serializeAsOps: this.serializeAsOps.bind(this),
    };
  }

  get id() {
    return this._id;
  }

  get parentId() {
    return this._parentId;
  }

  get data(): Readonly<T> {
    return this._data;
  }

  private attach(parentId: string) {
    this._parentId = parentId;
  }

  private attachChild(key: keyof T, child: Crdt) {
    this._data[key] = child as any;
    this.notify();
  }

  private deleteChild(child: Crdt) {
    for (const key in this._data) {
      if (this._data[key] === child) {
        delete this._data[key];
      }
    }

    if (child instanceof LiveRecord) {
      child.detach();
    }

    this.notify();
  }

  private detach() {
    this._doc.deleteItem(this);

    for (const key in this._data) {
      const value = this._data[key] as any;
      if (value instanceof LiveRecord) {
        value.detach();
      }
    }
  }

  private apply(op: Op) {
    if (op.type === OpType.UpdateRecord) {
      for (const key in op.data as Partial<T>) {
        const oldValue = this._data[key] as any;

        if (oldValue instanceof LiveRecord) {
          oldValue.detach();
        }

        const value = op.data[key];
        this._data[key] = value as any; // TODO: Find out why typescript complains
      }
      this.notify();
    }
  }

  private notify() {
    for (const listener of this._listeners) {
      listener();
    }
  }

  private serializeAsOps(parentId?: string, parentKey?: string): Op[] {
    const ops: Op[] = [];

    const createOp: CreateRecordOp = {
      id: this.id,
      type: OpType.CreateRecord,
      parentId,
      parentKey,
      data: {},
    };

    ops.push(createOp);

    for (const key in this.data) {
      const value = this.data[key] as any;
      if (value instanceof LiveRecord) {
        ops.push(...value.serializeAsOps(this.id, key));
      } else if (value instanceof LiveList) {
        ops.push(...value[INTERNAL].serializeAsOps(this.id, key));
      } else {
        createOp.data[key] = value;
      }
    }

    return ops;
  }

  update(overrides: Partial<T>) {
    const ops = [];
    const updateOperation: RecordUpdateOp = {
      id: this.id,
      type: OpType.UpdateRecord,
      data: {},
    };
    ops.push(updateOperation);

    for (const key in overrides) {
      const oldValue = this._data[key] as any;

      if (oldValue instanceof LiveRecord) {
        oldValue.detach();
      }

      const value = overrides[key] as any;
      if (value instanceof LiveRecord) {
        ops.push(...value.serializeAsOps(this.id, key));
      } else {
        updateOperation.data[key] = value;
      }

      this._data[key] = value as any; // TODO: Find out why typescript complains
    }

    this._doc._dispatch(ops);
    this.notify();
  }

  subscribe(listener: () => void) {
    this._listeners.push(listener);
  }

  unsubscribe(listener: () => void) {
    remove(this._listeners, listener);
  }
}

type LiveListItem = [crdt: Crdt, position: string];

export class LiveList<T extends LiveRecord = LiveRecord> {
  private _listeners: Array<() => void> = [];

  // TODO: Find a better data structure
  private _items: Array<LiveListItem> = [];

  constructor(
    private _doc: Storage,
    private _id: string,
    items: T[] = [],
    private _parentId: string | null = null
  ) {
    let position = undefined;
    for (let i = 0; i < items.length; i++) {
      const newPosition = makePosition(position);
      items[i][INTERNAL].attach(_id);
      this._items.push([items[i], newPosition]);
      position = newPosition;
    }
  }

  static deserialize(
    [id, item]: SerializedCrdtWithId,
    parentToChildren: Map<string, SerializedCrdtWithId[]>,
    doc: Storage
  ) {
    const list = new LiveList(doc, id);
    doc.addItem(id, list);

    const children = parentToChildren.get(list.id);

    if (children == null) {
      return list;
    }

    for (const entry of children) {
      const child = LiveRecord.deserialize(entry, parentToChildren, doc);
      list.attachChild(entry[1].parentKey!, child);
    }

    return list;
  }

  get [INTERNAL]() {
    return {
      attachChild: this.attachChild.bind(this),
      deleteChild: this.deleteChild.bind(this),
      attach: this.attach.bind(this),
      apply: this.apply.bind(this),
      serializeAsOps: this.serializeAsOps.bind(this),
      setChildKey: this.setChildKey.bind(this),
    };
  }

  get id() {
    return this._id;
  }

  get parentId() {
    return this._parentId;
  }

  private attach(parentId: string) {
    this._parentId = parentId;
  }

  private attachChild(key: string, child: LiveRecord) {
    this._items.push([child, key]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  private deleteChild(child: Crdt) {
    const indexToDelete = this._items.findIndex(
      (item) => item[0].id === child.id
    );
    this._items.splice(indexToDelete);
    if (child instanceof LiveRecord) {
      child[INTERNAL].detach();
    }
    this.notify();
  }

  private setChildKey(key: string, child: Crdt) {
    const item = this._items.find((item) => item[0].id === child.id);
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

  private serializeAsOps(parentId?: string, parentKey?: string): Op[] {
    const ops: Op[] = [];

    if (parentId == null || parentKey == null) {
      throw new Error("List can't be a document root");
    }

    const createOp: CreateListOp = {
      id: this.id,
      type: OpType.CreateList,
      parentId,
      parentKey,
    };

    ops.push(createOp);

    for (const [item, position] of this._items) {
      ops.push(...item[INTERNAL].serializeAsOps(this.id, position));
    }

    return ops;
  }

  push(item: T) {
    const position =
      this._items.length === 0
        ? makePosition()
        : makePosition(this._items[this._items.length - 1][1]);

    this._items.push([item, position]);
    const ops = item[INTERNAL].serializeAsOps(this.id, position);
    this._doc._dispatch(ops);
    this.notify();
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

    this._items.push([item, position]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    const ops = item[INTERNAL].serializeAsOps(this.id, position);
    this._doc._dispatch(ops);
    this.notify();
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

    this._doc._dispatch([
      {
        type: OpType.SetParentKey,
        id: item[0].id,
        parentKey: position,
      },
    ]);
    this.notify();
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

    const childRecord = item[0] as LiveRecord;

    childRecord[INTERNAL].detach();

    this._doc._dispatch([
      {
        id: childRecord.id,
        type: OpType.DeleteRecord,
      },
    ]);
    this.notify();
  }

  toArray(): T[] {
    return this._items.map((entry) => entry[0] as T);
  }

  get(index: number): T {
    return this._items[index][0] as T;
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
  doc: Storage
): Crdt {
  switch (entry[1].type) {
    case CrdtType.Record: {
      return LiveRecord.deserialize(entry, parentToChildren, doc);
    }
    case CrdtType.List: {
      return LiveList.deserialize(entry, parentToChildren, doc);
    }
    default: {
      throw new Error("Unexpected CRDT type");
    }
  }
}
