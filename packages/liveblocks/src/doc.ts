import {
  Op,
  SerializedRecord,
  OpType,
  SerializedCrdt,
  RecordUpdateOp,
  ListInsertOp,
  SerializedList,
  ListMoveOp,
  ListDeleteOp,
  CrdtType,
} from "./live";
import { compare, makePosition } from "./position";
import { Serializable, SerializablePrimitive } from "./types";

type Link = {
  parentId: string;
  parentKey: string;
};

type Links = Map<string, Link>;
type ListCache = Map<string, Map<string, Crdt>>;

type Cache = {
  links: Links;
  listCache: ListCache;
};

type Crdt = Record | List<any>;

const RECORD = Symbol("liveblocks.record");
const LIST = Symbol("liveblocks.list");

export function createRecord<T extends RecordData>(
  id: string,
  data: T
): Record<T> {
  return {
    id,
    $$type: RECORD,
    ...data,
  } as Record<T>;
}

export function createList<T>(id: string, items: T[] = []): List<T> {
  return {
    id,
    $$type: LIST,
    length: items.length,
    toArray: () => items,
    map: <U>(callback: (value: T, index: number) => U) => items.map(callback),
  };
}

export type RecordData = { [key: string]: RecordValue };

type RecordValue =
  | SerializablePrimitive
  | Array<SerializablePrimitive>
  | Serializable
  | Record<any>
  | List<any>;

export type Record<T extends RecordData = RecordData> = {
  readonly id: string;
  readonly $$type: typeof RECORD;
} & T;

export type List<T> = {
  readonly id: string;
  readonly $$type: typeof LIST;
  toArray(): Array<T>;
  map<U>(callback: (value: T, index: number) => U): U[];

  readonly length: number;
};

type Emit = (op: Op) => void;
function noop() {}
export class Doc<T extends RecordData> {
  constructor(
    public root: Record<T>,
    private _cache: Cache,
    private _emit: Emit
  ) {}

  static empty<T extends RecordData>(
    id: string = "root",
    emit: Emit = noop
  ): Doc<T> {
    const root = {
      id,
      $$type: RECORD,
    } as Record<T>;
    return new Doc<T>(root, { links: new Map(), listCache: new Map() }, emit);
  }

  static createFromRoot<T extends RecordData>(
    data: T,
    id: string = "root",
    emit: Emit = noop
  ) {
    let doc = Doc.empty<T>(id, emit);
    doc = doc.updateRecord(doc.root.id, data);
    return doc;
  }

  static load<T extends RecordData>(
    root: SerializedRecord,
    emit: Emit = noop
  ): Doc<T> {
    let doc = Doc.empty<T>(root.id, emit);
    return doc.dispatch({
      type: OpType.RecordUpdate,
      id: root.id,
      data: root.data,
    });
  }

  get data() {
    return this.root;
  }

  dispatch(op: Op, shouldEmit = false): Doc<T> {
    if (shouldEmit) {
      this._emit(op);
    }

    if (op.id === this.root.id) {
      const node = dispatch(this.root, op, this._cache, []);
      return new Doc(node as Record<T>, this._cache, this._emit);
    } else {
      const links = getAllLinks(op.id, this.root.id, this._cache.links);
      const node = dispatch(this.root, op, this._cache, links);
      return new Doc(node as Record<T>, this._cache, this._emit);
    }
  }

  private getChild(id: string) {
    if (id === this.root.id) {
      return this.root;
    }

    const allLinks = getAllLinks(id, this.root.id, this._cache.links);

    return getChildDeep(this.root, id, allLinks, this._cache);
  }

  updateRecord<TRecord>(id: string, overrides: Partial<TRecord>) {
    const currentRecord = this.getChild(id);

    if (currentRecord == null) {
      throw new Error(`Record with id "${id}" does not exist`);
    }

    let data: { [key: string]: SerializedCrdt } = {};

    for (const key in overrides) {
      const value = overrides[key];
      data[key] = serialize(value);
    }

    const op: RecordUpdateOp = {
      id: currentRecord.id,
      type: OpType.RecordUpdate,
      data,
    };

    return this.dispatch(op, true);
  }

  pushItem<TItem>(id: string, item: TItem) {
    const list = this.getChild(id) as List<any>;

    if (list == null) {
      throw new Error(`List with id "${id}" does not exist`);
    }

    if (list.$$type !== LIST) {
      throw new Error(`Node with id "${id}" is not a list`);
    }

    if (!isRecord(item)) {
      throw new Error("List can't only have Record as children");
    }

    const data = serialize(item);

    if (list.length === 0) {
      return this.dispatch(
        {
          type: OpType.ListInsert,
          id: list.id,
          position: makePosition(),
          data,
        },
        true
      );
    }

    const items = sortedListItems(getListItems(this._cache, id));
    const [tailPosition] = items[items.length - 1];

    const position = makePosition(tailPosition);

    const operation: ListInsertOp = {
      type: OpType.ListInsert,
      id: list.id,
      position,
      data,
    };

    return this.dispatch(operation, true);
  }

  moveItem(id: string, index: number, targetIndex: number) {
    const list = this.getChild(id);

    if (list == null) {
      throw new Error(`List with id "${id}" does not exist`);
    }

    if (list.$$type !== LIST) {
      throw new Error(`Node with id "${id}" is not a list`);
    }

    const items = sortedListItems(getListItems(this._cache, id));

    if (targetIndex < 0) {
      throw new Error("targetIndex cannont be less than 0");
    }

    if (targetIndex >= items.length) {
      throw new Error(
        "targetIndex cannot be greater or equal than the list length"
      );
    }

    if (index < 0) {
      throw new Error("index cannont be less than 0");
    }

    if (index >= items.length) {
      throw new Error("index cannot be greater or equal than the list length");
    }

    if (index === targetIndex) {
      return this;
    }

    let beforePosition = null;
    let afterPosition = null;

    if (index < targetIndex) {
      afterPosition =
        targetIndex === items.length - 1
          ? undefined
          : items[targetIndex + 1][0];
      beforePosition = items[targetIndex][0];
    } else {
      afterPosition = items[targetIndex][0];
      beforePosition =
        targetIndex === 0 ? undefined : items[targetIndex - 1][0];
    }

    const position = makePosition(beforePosition, afterPosition);

    const [, item] = items[index];
    return this.dispatch(
      {
        type: OpType.ListMove,
        id: list.id,
        itemId: item.id,
        position,
      },
      true
    );
  }

  deleteItem(id: string, index: number) {
    const list = this.getChild(id);

    if (list == null) {
      throw new Error(`List with id "${id}" does not exist`);
    }

    if (list.$$type !== LIST) {
      throw new Error(`Node with id "${id}" is not a list`);
    }

    const items = sortedListItems(getListItems(this._cache, id));

    const [position, item] = items[index];

    return this.dispatch(
      {
        type: OpType.ListRemove,
        id: list.id,
        itemId: item.id,
      },
      true
    );
  }
}

function getAllLinks(id: string, rootId: string, links: Links) {
  let currentId = id;
  const result: Link[] = [];
  do {
    const link = links.get(currentId);
    if (link == null) {
      throw new Error(`Can't find link for id "${currentId}"`);
    }

    currentId = link.parentId;
    result.push(link);
  } while (currentId !== rootId);

  return result;
}

function deserializeList(serialized: SerializedList, cache: Cache): List<any> {
  const listItems = new Map<string, Crdt>();

  for (const position in serialized.data) {
    const item = deserialize(serialized.data[position], cache);
    if (!isRecord(item)) {
      throw new Error("TODO");
    }
    listItems.set(position, item);
    cache.links.set(item.id, { parentId: serialized.id, parentKey: position });
  }

  cache.listCache.set(serialized.id, listItems);

  return createList(serialized.id, listItemsToArray(listItems));
}

function getListItems(cache: Cache, listId: string) {
  const items = cache.listCache.get(listId);
  if (items == null) {
    throw new Error(`Can't find list cache for id "${listId}"`);
  }
  return items;
}

function deserializeRecord(serialized: SerializedRecord, cache: Cache): Record {
  const result: any = {
    id: serialized.id,
    $$type: RECORD,
  };

  for (const key in serialized.data) {
    const item = deserialize(serialized.data[key], cache);
    if (isCrdt(item)) {
      cache.links.set(item.id, {
        parentId: serialized.id,
        parentKey: key,
      });
    }
    result[key] = item;
  }

  return result;
}

function deserialize(
  serialized: SerializedCrdt,
  cache: Cache
): Record | List<any> | string {
  switch (serialized.type) {
    case CrdtType.Register: {
      return serialized.data;
    }
    case CrdtType.Record: {
      return deserializeRecord(serialized, cache);
    }
    case CrdtType.List: {
      return deserializeList(serialized, cache);
    }
    default: {
      throw new Error("TODO");
    }
  }
}

function dispatchOnRecord(
  record: Record<any>,
  op: Op,
  cache: Cache,
  links: Link[]
): Record {
  if (links.length === 0) {
    if (record.id !== op.id) {
      throw new Error("TODO");
    }

    switch (op.type) {
      case OpType.RecordUpdate: {
        return updateRecord(record, op, cache);
      }
      default: {
        console.warn("Unsupported operation");
        return record;
      }
    }
  }

  const currentLink = links.pop()!;

  const child = record[currentLink.parentKey];

  const newNode = dispatch(child, op, cache, links);

  return {
    ...record,
    [currentLink.parentKey]: newNode,
  };
}

function dispatchOnList(
  list: List<any>,
  op: Op,
  cache: Cache,
  links: Link[]
): List<any> {
  if (links.length === 0) {
    if (list.id !== op.id) {
      throw new Error("TODO");
    }

    switch (op.type) {
      case OpType.ListInsert: {
        return listInsert(list, op, cache);
      }
      case OpType.ListMove: {
        return listMove(list, op, cache);
      }
      case OpType.ListRemove: {
        return listDelete(list, op, cache);
      }
      default: {
        console.warn("Unsupported operation");
        return list;
      }
    }
  }

  const currentLink = links.pop()!;

  const position = currentLink.parentKey;

  const items = getListItems(cache, list.id);

  const item = items.get(position);

  if (item == null) {
    throw new Error("TODO");
  }

  const newItem = dispatch(item, op, cache, links);

  items.set(position, newItem);

  return createList(list.id, listItemsToArray(items));
}

function dispatch(node: Crdt, op: Op, cache: Cache, links: Link[]): Crdt {
  switch (node.$$type) {
    case RECORD:
      return dispatchOnRecord(node, op, cache, links);
    case LIST:
      return dispatchOnList(node, op, cache, links);
    default: {
      throw new Error("Unknown CRDT");
    }
  }
}

function updateRecord(
  node: Record<any>,
  op: RecordUpdateOp,
  cache: Cache
): Record {
  const result = { ...node };

  for (const key in op.data) {
    const value = op.data[key];
    const item = deserialize(value, cache);
    if (isCrdt(item)) {
      cache.links.set(item.id, { parentId: node.id, parentKey: key });
    }
    result[key] = item;
  }

  return result;
}

function listInsert(
  list: List<any>,
  op: ListInsertOp,
  cache: Cache
): List<any> {
  const items = getListItems(cache, list.id);

  const item = deserialize(op.data, cache);
  if (isCrdt(item)) {
    items.set(op.position, item);
    cache.links.set(item.id, { parentId: list.id, parentKey: op.position });
  }

  return createList(list.id, listItemsToArray(items));
}

function listMove(list: List<any>, op: ListMoveOp, cache: Cache): List<any> {
  const items = getListItems(cache, list.id);
  const link = getLinkOrThrow(cache, op.itemId);

  const item = items.get(link.parentKey);

  if (item == null) {
    throw new Error("TODO");
  }

  // Delete old position cache entry
  items.delete(link.parentKey);

  // Insert new position in cache
  items.set(op.position, item);

  // Update link
  cache.links.set(op.itemId, { parentId: list.id, parentKey: op.position });

  return createList(list.id, listItemsToArray(items));
}

function getLinkOrThrow(cache: Cache, id: string): Link {
  const link = cache.links.get(id);

  if (link == null) {
    throw new Error(`Can't find link with id "${id}"`);
  }

  return link;
}

function listDelete(
  list: List<any>,
  op: ListDeleteOp,
  cache: Cache
): List<any> {
  const items = getListItems(cache, list.id);
  const link = getLinkOrThrow(cache, op.itemId);

  items.delete(link.parentKey);
  cache.links.delete(op.itemId);

  return createList(list.id, listItemsToArray(items));
}

function listItemsToArray(items: Map<string, Crdt>) {
  return sortedListItems(items).map((entry) => entry[1]);
}

function sortedListItems(items: Map<string, Crdt>) {
  return Array.from(items.entries()).sort((entryA, entryB) =>
    compare({ position: entryA[0] }, { position: entryB[0] })
  );
}

function getChildDeep(
  node: Crdt,
  id: string,
  links: Link[],
  cache: Cache
): Crdt {
  let currentNode = node;

  while (currentNode.id !== id) {
    const link = links.pop();

    if (link == null || link.parentId !== currentNode.id) {
      throw new Error("TODO");
    }

    if (currentNode.$$type === RECORD) {
      currentNode = (currentNode as Record<any>)[link.parentKey];
    } else {
      const listItems = getListItems(cache, currentNode.id);
      const item = listItems.get(link.parentKey);
      if (item == null) {
        throw new Error("TODO");
      }
      currentNode = item;
    }
  }

  return currentNode;
}

function isRecord(value: any): value is Record {
  return value != null && typeof value === "object" && value.$$type === RECORD;
}

function isList(value: any): value is List<any> {
  return value != null && typeof value === "object" && value.$$type === LIST;
}

function isCrdt(value: any): value is Crdt {
  return isRecord(value) || isList(value);
}

function serializeRecord(record: Record): SerializedRecord {
  const serializedData: any = {};
  for (const key in record) {
    if (key !== "id" && key !== "$$type") {
      const value = record[key]!; // TODO: Find out why typescript does not like that
      serializedData[key] = serialize(value);
    }
  }
  return {
    id: record.id,
    type: CrdtType.Record,
    data: serializedData,
  };
}

function serializeList(list: List<any>): SerializedList {
  return {
    id: list.id,
    type: CrdtType.List,
    data: {},
  };
}

function serialize(value: any): SerializedCrdt {
  if (isRecord(value)) {
    return serializeRecord(value);
  } else if (isList(value)) {
    return serializeList(value);
  } else {
    return { type: CrdtType.Register, data: value };
  }
}
