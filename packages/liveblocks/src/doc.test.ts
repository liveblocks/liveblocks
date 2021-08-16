import { CrdtType, Op, OpType, SerializedCrdtWithId } from "./live";
import { Doc, LiveList, LiveRecord } from "./doc";

function docToJson(doc: Doc<any>) {
  return recordToJson(doc.root);
}

function recordToJson(record: LiveRecord) {
  const result: any = {};
  const obj = record.toObject();

  for (const key in obj) {
    result[key] = toJson(obj[key]);
  }

  return result;
}

function listToJson(list: LiveList): Array<any> {
  return list.toArray().map(toJson);
}

function toJson(value: any) {
  if (value instanceof LiveRecord) {
    return recordToJson(value);
  } else if (value instanceof LiveList) {
    return listToJson(value);
  }

  return value;
}

function prepareStorageTest<T>(
  items: SerializedCrdtWithId[],
  actor: number = 0
) {
  const clonedItems = JSON.parse(JSON.stringify(items));
  const refStorage = Doc.load<T>(items, actor);
  const storage = Doc.load<T>(clonedItems, actor, (ops) => {
    for (const op of ops) {
      refStorage.apply(op);
    }
  });

  function assert(data: any) {
    const json = docToJson(storage);
    expect(json).toEqual(data);
    expect(docToJson(refStorage)).toEqual(data);
    expect(storage.count()).toBe(refStorage.count());
  }

  return {
    storage,
    refStorage,
    assert,
  };
}

function createSerializedRecord(
  id: string,
  data: any,
  parentId?: string,
  parentKey?: string
): SerializedCrdtWithId {
  return [
    id,
    {
      type: CrdtType.Record,
      data,
      parentId,
      parentKey,
    },
  ];
}

function createSerializedList(
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

describe("Storage", () => {
  it("update root", () => {
    const { storage, assert } = prepareStorageTest([
      createSerializedRecord("0:0", { a: 0 }),
    ]);

    assert({
      a: 0,
    });

    storage.root.update({ a: 1 });
    assert({
      a: 1,
    });

    storage.root.update({ b: 1 });
    assert({
      a: 1,
      b: 1,
    });
  });

  it("remove child record with update", () => {
    const { storage, assert } = prepareStorageTest<{
      a: number;
      child: LiveRecord<{
        b: number;
        grandChild: LiveRecord<{ c: number }>;
      }> | null;
    }>([
      createSerializedRecord("0:0", { a: 0 }),
      createSerializedRecord("0:1", { b: 0 }, "0:0", "child"),
      createSerializedRecord("0:2", { c: 0 }, "0:1", "grandChild"),
    ]);

    assert({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 0,
        },
      },
    });

    storage.root.update({ child: null });

    assert({
      a: 0,
      child: null,
    });
    expect(storage.count()).toBe(1);
  });

  it("update record with null prop", () => {
    const { storage: doc, assert } = prepareStorageTest([
      createSerializedRecord("0:0", { a: 0 }),
    ]);

    assert({
      a: 0,
    });

    doc.root.update({ a: null });

    assert({
      a: null,
    });

    doc.root.update({ a: 0 });

    assert({
      a: 0,
    });
  });

  it("delete record key", () => {
    const { storage: doc, assert } = prepareStorageTest<{ a: number }>([
      createSerializedRecord("0:0", { a: 0 }),
    ]);

    doc.root.delete("a");

    assert({});
  });

  it("add nested record with update", () => {
    const { storage, assert } = prepareStorageTest(
      [createSerializedRecord("0:0", {})],
      1
    );

    assert({});

    storage.root.update({
      child: new LiveRecord({ a: 0 }),
    });

    assert({
      child: {
        a: 0,
      },
    });

    expect(storage.count()).toBe(2);
  });

  it("update nested record", () => {
    const { storage, assert } = prepareStorageTest<{
      a: number;
      child: LiveRecord<{ b: number }>;
    }>([
      createSerializedRecord("0:0", { a: 0 }),
      createSerializedRecord("0:1", { b: 0 }, "0:0", "child"),
    ]);

    const root = storage.root;
    const child = root.toObject().child;

    assert({
      a: 0,
      child: {
        b: 0,
      },
    });

    child.update({ b: 1 });
    assert({
      a: 0,
      child: {
        b: 1,
      },
    });
  });

  it("update deeply nested record", () => {
    const { storage, assert } = prepareStorageTest<{
      a: number;
      child: LiveRecord<{ b: number; grandChild: LiveRecord<{ c: number }> }>;
    }>([
      createSerializedRecord("0:0", { a: 0 }),
      createSerializedRecord("0:1", { b: 0 }, "0:0", "child"),
      createSerializedRecord("0:2", { c: 0 }, "0:1", "grandChild"),
    ]);

    assert({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 0,
        },
      },
    });

    const root = storage.root;
    const child = root.toObject().child;
    const grandChild = child.toObject().grandChild;
    expect(root.toObject()).toMatchObject({ a: 0 });
    expect(child.toObject()).toMatchObject({ b: 0 });
    expect(grandChild.toObject()).toMatchObject({ c: 0 });

    grandChild.update({ c: 1 });
    expect(grandChild.toObject()).toMatchObject({ c: 1 });

    assert({
      a: 0,
      child: {
        b: 0,
        grandChild: {
          c: 1,
        },
      },
    });
  });

  it("create document with list in root", () => {
    const { storage, assert } = prepareStorageTest<{
      items: LiveList;
    }>([
      createSerializedRecord("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
    ]);

    const root = storage.root;
    expect(root.toObject().items.toArray()).toMatchObject([]);

    assert({
      items: [],
    });
  });

  it("init list with items", () => {
    const { storage, assert } = prepareStorageTest<{
      items: LiveList<LiveRecord<{ a: number }>>;
    }>([
      createSerializedRecord("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
      createSerializedRecord("0:2", { a: 0 }, "0:1", "!"),
      createSerializedRecord("0:3", { a: 1 }, "0:1", '"'),
      createSerializedRecord("0:4", { a: 2 }, "0:1", "#"),
    ]);
    const root = storage.root;
    expect(
      root
        .toObject()
        .items.toArray()
        .map((r) => r.toObject())
    ).toMatchObject([{ a: 0 }, { a: 1 }, { a: 2 }]);

    assert({
      items: [{ a: 0 }, { a: 1 }, { a: 2 }],
    });
  });

  it("list.push record", () => {
    const { storage, assert } = prepareStorageTest<{
      items: LiveList;
    }>(
      [
        createSerializedRecord("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
      ],
      1
    );

    const root = storage.root;
    const items = root.toObject().items;
    expect(items.toArray()).toMatchObject([]);

    assert({
      items: [],
    });

    items.push(new LiveRecord({ b: 0 }));
    items.push(new LiveRecord({ b: 1 }));
    items.push(new LiveRecord({ b: 2 }));
    expect(items.toArray().map((r) => r.toObject())).toMatchObject([
      { b: 0 },
      { b: 1 },
      { b: 2 },
    ]);
    assert({
      items: [{ b: 0 }, { b: 1 }, { b: 2 }],
    });
  });

  it("list.push record then delete", () => {
    let { storage: doc } = prepareStorageTest<{
      items: LiveList<LiveRecord<{ b: number }>>;
    }>([
      createSerializedRecord("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
    ]);

    const root = doc.root;
    const items = root.toObject().items;
    expect(items.toArray()).toMatchObject([]);

    items.push(new LiveRecord({ b: 0 }));
    expect(items.toArray().map((r) => r.toObject())).toMatchObject([{ b: 0 }]);

    items.delete(0);
    expect(items.toArray()).toMatchObject([]);
  });

  it("list.delete child record should remove descendants", () => {
    const { storage, assert } = prepareStorageTest<{
      items: LiveList<LiveRecord<{ child: LiveRecord<{ a: number }> }>>;
    }>([
      createSerializedRecord("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
      createSerializedRecord("0:2", {}, "0:1", "!"),
      createSerializedRecord("0:3", { a: 0 }, "0:2", "child"),
    ]);

    assert({
      items: [
        {
          child: {
            a: 0,
          },
        },
      ],
    });

    storage.root.toObject().items.delete(0);

    assert({
      items: [],
    });

    expect(storage.count()).toBe(2);
  });

  it("list.insert at index 0", () => {
    let { storage } = prepareStorageTest<{
      items: LiveList<LiveRecord<{ a: number }>>;
    }>([
      createSerializedRecord("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
      createSerializedRecord("0:2", { a: 1 }, "0:1", "!"),
    ]);

    const root = storage.root;
    const items = root.toObject().items;
    items.insert(new LiveRecord({ a: 0 }), 0);

    expect(items.toArray().map((r) => r.toObject())).toMatchObject([
      { a: 0 },
      { a: 1 },
    ]);
  });

  it("list.move after current position", () => {
    const { storage } = prepareStorageTest<{
      items: LiveList<LiveRecord<{ a: number }>>;
    }>([
      createSerializedRecord("0:0", {}),
      createSerializedList("0:1", "0:0", "items"),
      createSerializedRecord("0:2", { a: 0 }, "0:1", "!"),
      createSerializedRecord("0:3", { a: 1 }, "0:1", '"'),
      createSerializedRecord("0:4", { a: 2 }, "0:1", "#"),
    ]);

    const root = storage.root;
    const items = root.toObject().items;
    items.move(0, 1);

    expect(items.toArray().map((r) => r.toObject())).toMatchObject([
      { a: 1 },
      { a: 0 },
      { a: 2 },
    ]);
  });

  it("list.push same record should throw", () => {
    const { storage, assert } = prepareStorageTest<{
      items: LiveList;
    }>(
      [
        createSerializedRecord("0:0", {}),
        createSerializedList("0:1", "0:0", "items"),
      ],
      1
    );

    const root = storage.root;
    const items = root.toObject().items;
    expect(items.toArray()).toMatchObject([]);

    assert({
      items: [],
    });

    const record = new LiveRecord({ b: 0 });

    items.push(record);
    expect(() => items.push(record)).toThrow();
  });

  describe("from", () => {
    it("nested records", () => {
      const ops: Op[] = [];
      const doc = Doc.from(
        {
          a: 0,
          child: new LiveRecord({ b: 0, grandChild: new LiveRecord({ c: 0 }) }),
        },
        0,
        (newOps) => ops.push(...newOps)
      );

      expect(ops).toEqual([
        {
          type: OpType.CreateRecord,
          id: "0:0",
          parentId: undefined,
          parentKey: undefined,
          data: {
            a: 0,
          },
        },
        {
          type: OpType.CreateRecord,
          id: "0:1",
          parentId: "0:0",
          parentKey: "child",
          data: {
            b: 0,
          },
        },
        {
          type: OpType.CreateRecord,
          id: "0:2",
          parentId: "0:1",
          parentKey: "grandChild",
          data: {
            c: 0,
          },
        },
      ]);
    });
  });
});
