import { remove } from "./utils";
import {
  CrdtType,
  CreateListOp,
  CreateRecordOp,
  DeleteRecordKeyOp,
  DeleteRecordOp,
  Op,
  OpType,
  RecordUpdateOp,
  SerializedCrdtWithId,
  SerializedList,
  SetParentKeyOp,
} from "./live";
import { compare, makePosition } from "./position";

const INTERNAL = Symbol("liveblocks.internal");

type Dispatch = (ops: Op[]) => void;

function noOp() {}

type Crdt = LiveRecord | LiveList;

export type RecordData = Record<string, any>;

export class Doc<T extends RecordData = RecordData> {
  private _clock = 0;
  private _items = new Map<string, Crdt>();

  private constructor(
    private _root: LiveRecord<T>,
    private actor: number = 0,
    private _dispatch: Dispatch = noOp
  ) {}

  static from<T>(root: T, actor: number = 0, dispatch: Dispatch = noOp) {
    const rootRecord = new LiveRecord(root) as LiveRecord<T>;
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

    const doc = new Doc<T>(null as any as LiveRecord<T>, actor, dispatch);
    doc._root = LiveRecord.deserialize(
      root,
      parentToChildren,
      doc
    ) as LiveRecord<T>;
    return doc;
  }

  dispatch(ops: Op[]) {
    this._dispatch(ops);
  }

  addItem(id: string, item: Crdt) {
    this._items.set(id, item);
  }

  deleteItem(id: string) {
    this._items.delete(id);
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
      case OpType.DeleteRecordKey: {
        this.applyDeleteRecordKey(op);
        break;
      }
    }
  }

  private applyDeleteRecordKey(op: DeleteRecordKeyOp) {
    const item = this._items.get(op.id);
    if (item) {
      item[INTERNAL].apply(op);
    }
  }

  private applyUpdateRecord(op: RecordUpdateOp) {
    const item = this._items.get(op.id);
    if (item) {
      item[INTERNAL].apply(op);
    }
  }

  private applyCreateRecord(op: CreateRecordOp) {
    const newRecord = new LiveRecord(op.data);
    newRecord[INTERNAL].attach(op.id, this, op.parentId, op.parentKey);

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

    const parentId = item[INTERNAL].ctx!.parentId;

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

    const parentId = item[INTERNAL].ctx!.parentId;

    if (parentId == null) {
      return;
    }

    const parent = this._items.get(parentId);

    if (parent && parent instanceof LiveList) {
      parent[INTERNAL].setChildKey(op.parentKey, item);
    }
  }

  get root(): LiveRecord<T> {
    return this._root;
  }

  count() {
    return this._items.size;
  }

  generateId() {
    return `${this.actor}:${this._clock++}`;
  }
}

export class LiveRecord<T extends RecordData = RecordData> {
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
    if (item.type !== CrdtType.Record) {
      throw new Error(
        `Tried to deserialize a record but item type is "${item.type}"`
      );
    }

    const record = new LiveRecord(item.data);
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
    };
  }

  private attach(
    id: string,
    doc: Doc,
    parentId?: string,
    parentKey?: string
  ): Op[] {
    if (this._ctx) {
      throw new Error("LiveRecord is already part of the storage!");
    }

    doc.addItem(id, this);

    this._ctx = {
      id,
      doc: doc,
      parentId,
    };

    const ops: Op[] = [];
    const createOp: CreateRecordOp = {
      id: this._ctx.id,
      type: OpType.CreateRecord,
      parentId,
      parentKey,
      data: {},
    };
    ops.push(createOp);

    for (const [key, value] of this._map) {
      if (value instanceof LiveRecord) {
        ops.push(...value.attach(doc.generateId(), doc, this._ctx.id, key));
      } else if (value instanceof LiveList) {
        ops.push(
          ...value[INTERNAL].attach(doc.generateId(), doc, this._ctx.id, key)
        );
      } else {
        createOp.data[key] = value;
      }
    }

    return ops;
  }

  private attachChild(key: keyof T, child: Crdt) {
    this._map.set(key as string, child);
    this.notify();
  }

  private detachChild(child: Crdt) {
    for (const [key, value] of this._map) {
      if (value === child) {
        this._map.delete(key);
      }
    }

    if (child instanceof LiveRecord) {
      child.detach();
    }

    this.notify();
  }

  private detach() {
    if (this._ctx == null) {
      return;
    }

    this._ctx.doc.deleteItem(this._ctx.id);

    for (const [, value] of this._map) {
      if (value instanceof LiveRecord) {
        value.detach();
      }
    }
  }

  private apply(op: Op) {
    if (op.type === OpType.UpdateRecord) {
      for (const key in op.data as Partial<T>) {
        const oldValue = this._map.get(key);

        if (oldValue instanceof LiveRecord) {
          oldValue.detach();
        }

        const value = op.data[key];
        this._map.set(key, value);
      }
      this.notify();
    } else if (op.type === OpType.DeleteRecordKey) {
      const key = op.key;
      const oldValue = this._map.get(key);

      if (oldValue instanceof LiveRecord) {
        oldValue.detach();
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

      if (item instanceof LiveRecord) {
        item.detach();
      }

      this._ctx.doc.dispatch([
        { type: OpType.DeleteRecordKey, id: this._ctx.id, key: key as string },
      ]);
    }

    this._map.delete(key as string);
    this.notify();
  }

  update(overrides: Partial<T>) {
    if (this._ctx) {
      const ops = [];
      const updateOperation: RecordUpdateOp = {
        id: this._ctx.id,
        type: OpType.UpdateRecord,
        data: {},
      };

      ops.push(updateOperation);

      for (const key in overrides) {
        const oldValue = this._map.get(key);

        if (oldValue instanceof LiveRecord) {
          oldValue.detach();
        }

        const value = overrides[key] as any;
        if (value instanceof LiveRecord) {
          ops.push(
            ...value.attach(
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

type LiveListItem = [crdt: Crdt, position: string];

export class LiveList<T extends LiveRecord = LiveRecord> {
  private _listeners: Array<() => void> = [];
  private _ctx?: {
    id: string;
    parentId: string;
    doc: Doc;
  };

  // TODO: Find a better data structure
  private _items: Array<LiveListItem> = [];

  constructor(items: T[] = []) {
    let position = undefined;
    for (let i = 0; i < items.length; i++) {
      const newPosition = makePosition(position);
      this._items.push([items[i], newPosition]);
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
      const child = LiveRecord.deserialize(entry, parentToChildren, doc);
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
    };
  }

  private attach(
    id: string,
    doc: Doc,
    parentId: string,
    parentKey: string
  ): Op[] {
    if (this._ctx) {
      throw new Error("LiveList is already part of the storage!");
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

    this._ctx.doc.deleteItem(this._ctx.id);
  }

  private attachChild(key: string, child: LiveRecord) {
    this._items.push([child, key]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );
    this.notify();
  }

  private detachChild(child: Crdt) {
    const indexToDelete = this._items.findIndex((item) => item[0] === child);
    this._items.splice(indexToDelete);
    if (child instanceof LiveRecord) {
      child[INTERNAL].detach();
    }
    this.notify();
  }

  private setChildKey(key: string, child: Crdt) {
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

    this._items.push([item, position]);
    this.notify();

    if (this._ctx) {
      const ops = item[INTERNAL].attach(
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

    this._items.push([item, position]);
    this._items.sort((itemA, itemB) =>
      compare({ position: itemA[1] }, { position: itemB[1] })
    );

    this.notify();

    if (this._ctx) {
      const ops = item[INTERNAL].attach(
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
      this._ctx.doc.dispatch([
        {
          type: OpType.SetParentKey,
          id: item[0][INTERNAL].ctx!.id,
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
      const childRecord = item[0] as LiveRecord;
      this._ctx.doc.dispatch([
        {
          id: childRecord[INTERNAL].ctx!.id,
          type: OpType.DeleteRecord,
        },
      ]);
      childRecord[INTERNAL].detach();
    }

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
  doc: Doc
): Crdt {
  switch (entry[1].type) {
    case CrdtType.Record: {
      return LiveRecord.deserialize(entry, parentToChildren, doc);
    }
    case CrdtType.List: {
      return LiveList.deserialize(
        entry as [string, SerializedList],
        parentToChildren,
        doc
      );
    }
    default: {
      throw new Error("Unexpected CRDT type");
    }
  }
}
