import { remove, isSameNodeOrChildOf } from "./utils";
import {
  CrdtType,
  Op,
  OpType,
  SerializedCrdtWithId,
  SerializedList,
  SerializedMap,
} from "./live";
import { AbstractCrdt } from "./AbstractCrdt";
import { LiveObject } from "./LiveObject";
import { LiveMap } from "./LiveMap";
import { LiveList } from "./LiveList";
import { LiveRegister } from "./LiveRegister";

type Dispatch = (ops: Op[]) => void;

function noOp() {}

type UndoStackItem = Op[];

const MAX_UNDO_STACK = 50;

type StorageSubscriberCallback = (nodes: AbstractCrdt[]) => void;

export type ApplyResult =
  | { reverse: Op[]; modified: AbstractCrdt }
  | { modified: false };

export class Doc<T extends Record<string, any> = Record<string, any>> {
  #clock = 0;
  #opClock = 0;
  #items = new Map<string, AbstractCrdt>();
  #root: LiveObject<T>;
  #actor: number;
  #broadcast: Dispatch;
  #undoStack: UndoStackItem[] = [];
  #redoStack: UndoStackItem[] = [];
  #isBatching: boolean = false;

  #toBatch = {
    ops: [] as Op[],
    modified: new Set<AbstractCrdt>(),
    reverseOps: [] as Op[],
  };

  _subscribers: Array<StorageSubscriberCallback> = [];

  get undoStack() {
    return this.#undoStack;
  }

  constructor(
    root: LiveObject<T>,
    actor: number = 0,
    broadcast: Dispatch = noOp
  ) {
    this.#root = root;
    this.#actor = actor;
    this.#broadcast = broadcast;
  }

  static from<T>(root: T, actor: number = 0, dispatch: Dispatch = noOp) {
    const rootRecord = new LiveObject(root) as LiveObject<T>;
    const storage = new Doc(rootRecord, actor, dispatch) as Doc<T>;
    rootRecord._attach(storage.generateId(), storage);
    storage.dispatch(rootRecord._serialize(), [], []);
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

  #genericSubscribe(callback: StorageSubscriberCallback) {
    this._subscribers.push(callback);
    return () => remove(this._subscribers, callback);
  }

  #crdtSubscribe<T extends AbstractCrdt>(
    crdt: T,
    innerCallback: () => void,
    options?: { isDeep: boolean }
  ) {
    const cb = (nodes: AbstractCrdt[]) => {
      for (const node of nodes) {
        if (
          node === crdt ||
          (options?.isDeep && isSameNodeOrChildOf(node, crdt))
        ) {
          innerCallback();
        }
      }
    };

    return this.#genericSubscribe(cb);
  }

  subscribe(
    node: AbstractCrdt,
    callback: () => void,
    options?: { isDeep: boolean }
  ): () => void;
  subscribe(callback: StorageSubscriberCallback): () => void;
  subscribe(
    ...parameters:
      | [
          item: AbstractCrdt,
          callback: () => void,
          options?: { isDeep: boolean }
        ]
      | [StorageSubscriberCallback]
  ): () => void {
    if (parameters[0] instanceof AbstractCrdt) {
      return this.#crdtSubscribe(
        parameters[0] as AbstractCrdt,
        parameters[1] as () => void,
        parameters[2]
      );
    }

    const callback = parameters[0];
    return this.#genericSubscribe(callback);
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

  applyRemoteOperations(ops: Op[]) {
    const applyResults = this.#apply(ops);
    const modified = new Set<AbstractCrdt>();

    for (const applyResult of applyResults) {
      if (applyResult.modified) {
        modified.add(applyResult.modified);
      }
    }

    this.#notify(modified);
  }

  #apply(ops: Op[]): ApplyResult[] {
    const result: ApplyResult[] = [];
    for (const op of ops) {
      result.push(this.#applyOp(op));
    }
    return result;
  }

  #applyOp(op: Op): ApplyResult {
    switch (op.type) {
      case OpType.DeleteObjectKey:
      case OpType.UpdateObject:
      case OpType.DeleteCrdt: {
        const item = this.#items.get(op.id);

        if (item == null) {
          return { modified: false };
        }

        return item._apply(op);
      }
      case OpType.SetParentKey: {
        const item = this.#items.get(op.id);

        if (item == null) {
          return { modified: false };
        }

        if (item._parent instanceof LiveList) {
          const previousKey = item._parentKey!;
          item._parent._setChildKey(op.parentKey, item);
          return {
            reverse: [
              {
                type: OpType.SetParentKey,
                id: item._id!,
                parentKey: previousKey,
              },
            ],
            modified: item,
          };
        }
        return { modified: false };
      }
      case OpType.CreateObject: {
        const parent = this.#items.get(op.parentId!);

        if (parent == null || this.getItem(op.id) != null) {
          return { modified: false };
        }

        return parent._attachChild(
          op.id,
          op.parentKey!,
          new LiveObject(op.data)
        );
      }
      case OpType.CreateList: {
        const parent = this.#items.get(op.parentId);

        if (parent == null || this.getItem(op.id) != null) {
          return { modified: false };
        }

        return parent._attachChild(op.id, op.parentKey!, new LiveList());
      }
      case OpType.CreateRegister: {
        const parent = this.#items.get(op.parentId);

        if (parent == null || this.getItem(op.id) != null) {
          return { modified: false };
        }

        return parent._attachChild(
          op.id,
          op.parentKey!,
          new LiveRegister(op.data)
        );
      }
      case OpType.CreateMap: {
        const parent = this.#items.get(op.parentId);

        if (parent == null || this.getItem(op.id) != null) {
          return { modified: false };
        }

        return parent._attachChild(op.id, op.parentKey!, new LiveMap());
      }
    }

    return { modified: false };
  }

  batch(fn: () => void) {
    if (this.#isBatching) {
      throw new Error("batch should not be called during a batch");
    }

    this.#isBatching = true;

    try {
      fn();
    } finally {
      // If the callback is throwing it's important to set the isBatching flag to false to make sure that future ops are dispatched
      this.#isBatching = false;
      this.#addToUndoStack(this.#toBatch.reverseOps);
      this.#redoStack = [];
      this.#broadcast(this.#toBatch.ops);
      this.#notify(this.#toBatch.modified);
      this.#toBatch = {
        ops: [],
        reverseOps: [],
        modified: new Set(),
      };
    }
  }

  get root(): LiveObject<T> {
    return this.#root;
  }

  dispatch(ops: Op[], reverse: Op[], modified: AbstractCrdt[]) {
    if (this.#isBatching) {
      this.#toBatch.ops.push(...ops);
      for (const item of modified) {
        this.#toBatch.modified.add(item);
      }
      this.#toBatch.reverseOps.push(...reverse);
    } else {
      this.#addToUndoStack(reverse);
      this.#redoStack = [];
      this.#broadcast(ops);
      this.#notify(new Set(modified));
    }
  }

  #notify(modified: Set<AbstractCrdt>) {
    if (modified.size === 0) {
      return;
    }

    for (const subscriber of this._subscribers) {
      subscriber(Array.from(modified));
    }
  }

  #addToUndoStack(ops: Op[]) {
    if (this.#undoStack.length >= MAX_UNDO_STACK) {
      this.#undoStack.shift();
    }
    this.#undoStack.push(ops);
  }

  undo() {
    if (this.#isBatching) {
      throw new Error("undo is not allowed during a batch");
    }

    const ops = this.#undoStack.pop();

    if (ops == null) {
      return;
    }

    const applyResults = this.#apply(ops);

    const reverse: Op[] = [];
    const modified = new Set<AbstractCrdt>();
    for (const applyResult of applyResults) {
      if (applyResult.modified) {
        reverse.push(...applyResult.reverse);
        modified.add(applyResult.modified);
      }
    }

    this.#notify(modified);
    this.#redoStack.push(reverse);
    this.#broadcast(ops);
  }

  redo() {
    if (this.#isBatching) {
      throw new Error("redo is not allowed during a batch");
    }

    const ops = this.#redoStack.pop();

    if (ops == null) {
      return;
    }

    const applyResults = this.#apply(ops);

    const reverse: Op[] = [];
    const modified = new Set<AbstractCrdt>();
    for (const applyResult of applyResults) {
      if (applyResult.modified) {
        reverse.push(...applyResult.reverse);
        modified.add(applyResult.modified);
      }
    }

    this.#notify(modified);
    this.#undoStack.push(reverse);
    this.#broadcast(ops);
  }

  count() {
    return this.#items.size;
  }

  generateId() {
    return `${this.#actor}:${this.#clock++}`;
  }

  generateOpId() {
    return `${this.#actor}:${this.#opClock++}`;
  }
}

export function deserialize(
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

export function isCrdt(obj: any): obj is AbstractCrdt {
  return (
    obj instanceof LiveObject ||
    obj instanceof LiveMap ||
    obj instanceof LiveList ||
    obj instanceof LiveRegister
  );
}

export function selfOrRegisterValue(obj: AbstractCrdt) {
  if (obj instanceof LiveRegister) {
    return obj.data;
  }

  return obj;
}

export function selfOrRegister(obj: any): AbstractCrdt {
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
