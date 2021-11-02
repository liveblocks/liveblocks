import { Doc } from "../src/doc";
import { CrdtType, Op, SerializedCrdtWithId } from "../src/live";
import { LiveList } from "../src/LiveList";
import { LiveMap } from "../src/LiveMap";
import { LiveObject } from "../src/LiveObject";
import { makePosition } from "../src/position";

export function docToJson(doc: Doc<any>) {
  return recordToJson(doc.root);
}

function recordToJson(record: LiveObject) {
  const result: any = {};
  const obj = record.toObject();

  for (const key in obj) {
    result[key] = toJson(obj[key]);
  }

  return result;
}

function listToJson<T>(list: LiveList<T>): Array<T> {
  return list.toArray().map(toJson);
}

function mapToJson<TKey extends string, TValue>(
  map: LiveMap<TKey, TValue>
): Array<[string, TValue]> {
  return Array.from(map.entries())
    .sort((entryA, entryB) => entryA[0].localeCompare(entryB[0]))
    .map((entry) => [entry[0], toJson(entry[1])]);
}

function toJson(value: any) {
  if (value instanceof LiveObject) {
    return recordToJson(value);
  } else if (value instanceof LiveList) {
    return listToJson(value);
  } else if (value instanceof LiveMap) {
    return mapToJson(value);
  }

  return value;
}

export const FIRST_POSITION = makePosition();
export const SECOND_POSITION = makePosition(FIRST_POSITION);
export const THIRD_POSITION = makePosition(SECOND_POSITION);
export const FOURTH_POSITION = makePosition(THIRD_POSITION);
export const FIFTH_POSITION = makePosition(FOURTH_POSITION);

export function assertStorage(storage: Doc, data: any) {
  const json = docToJson(storage);
  expect(json).toEqual(data);
}

export function prepareStorageTest<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  const clonedItems = JSON.parse(JSON.stringify(items));
  const refDoc = Doc.load<T>(items, actor);
  const operations: Op[] = [];
  const doc = Doc.load<T>(clonedItems, actor, (ops) => {
    operations.push(...ops);
    refDoc.applyRemoteOperations(ops);
    doc.applyRemoteOperations(ops);
  });

  const states: any[] = [];

  function assert(data: any, shouldPushToStates = true) {
    if (shouldPushToStates) {
      states.push(data);
    }
    const json = docToJson(doc);
    expect(json).toEqual(data);
    expect(docToJson(refDoc)).toEqual(data);
    expect(doc.count()).toBe(refDoc.count());
  }

  function assertUndoRedo() {
    for (let i = 0; i < states.length - 1; i++) {
      doc.undo();
      assert(states[states.length - 2 - i], false);
    }

    for (let i = 0; i < states.length - 1; i++) {
      doc.redo();
      assert(states[i + 1], false);
    }

    for (let i = 0; i < states.length - 1; i++) {
      doc.undo();
      assert(states[states.length - 2 - i], false);
    }
  }

  return {
    operations,
    storage: doc,
    refStorage: refDoc,
    assert,
    assertUndoRedo,
  };
}

export function createSerializedObject(
  id: string,
  data: Record<string, any>,
  parentId?: string,
  parentKey?: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Object,
      data,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedList(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.List,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedMap(
  id: string,
  parentId: string,
  parentKey: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Map,
      parentId,
      parentKey,
    },
  ];
}

export function createSerializedRegister(
  id: string,
  parentId: string,
  parentKey: string,
  data: any
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Register,
      parentId,
      parentKey,
      data,
    },
  ];
}
