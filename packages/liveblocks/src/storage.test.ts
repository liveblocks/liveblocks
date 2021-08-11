import { CrdtType, Op, SerializedCrdtWithId } from "./live";
import { Storage, LiveList, LiveRecord } from "./storage";

function docToJson(doc: Storage<any>) {
  return recordToJson(doc.root);
}

function recordToJson(record: LiveRecord) {
  const result: any = {
    id: record.id,
    data: {},
  };

  for (const key in record.data) {
    result.data[key] = toJson(record.data[key]);
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
  const refStorage = Storage.load<T>(actor, items);
  const storage = Storage.load<T>(actor, clonedItems, (ops) => {
    for (const op of ops) {
      refStorage.apply(op);
    }
  });

  function assert(data: any) {
    const json = docToJson(storage);
    expect(json).toEqual(docToJson(refStorage));
    expect(json).toEqual(data);
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

describe("Doc", () => {
  it("update root", () => {
    const { storage, assert } = prepareStorageTest([
      createSerializedRecord("0:0", { a: 0 }),
    ]);

    assert({
      id: "0:0",
      data: {
        a: 0,
      },
    });

    storage.root.update({ a: 1 });
    assert({
      id: "0:0",
      data: {
        a: 1,
      },
    });

    storage.root.update({ b: 1 });
    assert({
      id: "0:0",
      data: {
        a: 1,
        b: 1,
      },
    });
  });

  it("remove child record with update", () => {
    const { storage: doc, assert } = prepareStorageTest<{
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
      id: "0:0",
      data: {
        a: 0,
        child: {
          id: "0:1",
          data: {
            b: 0,
            grandChild: {
              id: "0:2",
              data: {
                c: 0,
              },
            },
          },
        },
      },
    });

    doc.root.update({ child: null });

    assert({
      id: "0:0",
      data: {
        a: 0,
        child: null,
      },
    });
    expect(doc.count()).toBe(1);
  });

  it("update record with null prop", () => {
    const { storage: doc, assert } = prepareStorageTest([
      createSerializedRecord("0:0", { a: 0 }),
    ]);

    assert({
      id: "0:0",
      data: {
        a: 0,
      },
    });

    doc.root.update({ a: null });

    assert({
      id: "0:0",
      data: {
        a: null,
      },
    });

    doc.root.update({ a: 0 });

    assert({
      id: "0:0",
      data: {
        a: 0,
      },
    });
  });

  it("add nested record with update", () => {
    const { storage, assert } = prepareStorageTest(
      [createSerializedRecord("0:0", {})],
      1
    );

    assert({
      id: "0:0",
      data: {},
    });

    storage.root.update({
      child: storage.createRecord({ a: 0 }),
    });

    assert({
      id: "0:0",
      data: {
        child: {
          id: "1:0",
          data: {
            a: 0,
          },
        },
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
    const child = root.data.child;

    assert({
      id: "0:0",
      data: {
        a: 0,
        child: {
          id: "0:1",
          data: {
            b: 0,
          },
        },
      },
    });

    child.update({ b: 1 });
    assert({
      id: "0:0",
      data: {
        a: 0,
        child: {
          id: "0:1",
          data: {
            b: 1,
          },
        },
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
      id: "0:0",
      data: {
        a: 0,
        child: {
          id: "0:1",
          data: {
            b: 0,
            grandChild: {
              id: "0:2",
              data: {
                c: 0,
              },
            },
          },
        },
      },
    });

    const root = storage.root;
    const child = root.data.child;
    const grandChild = child.data.grandChild;
    expect(root.data).toMatchObject({ a: 0 });
    expect(child.data).toMatchObject({ b: 0 });
    expect(grandChild.data).toMatchObject({ c: 0 });

    grandChild.update({ c: 1 });
    expect(grandChild.data).toMatchObject({ c: 1 });

    assert({
      id: "0:0",
      data: {
        a: 0,
        child: {
          id: "0:1",
          data: {
            b: 0,
            grandChild: {
              id: "0:2",
              data: {
                c: 1,
              },
            },
          },
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
    expect(root.data.items.toArray()).toMatchObject([]);

    assert({
      id: "0:0",
      data: {
        items: [],
      },
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
    expect(root.data.items.toArray()).toMatchObject([
      { data: { a: 0 } },
      { data: { a: 1 } },
      { data: { a: 2 } },
    ]);

    assert({
      id: "0:0",
      data: {
        items: [
          { id: "0:2", data: { a: 0 } },
          { id: "0:3", data: { a: 1 } },
          { id: "0:4", data: { a: 2 } },
        ],
      },
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
    const items = root.data.items;
    expect(items.toArray()).toMatchObject([]);

    assert({
      id: "0:0",
      data: {
        items: [],
      },
    });

    items.push(storage.createRecord({ b: 0 }));
    items.push(storage.createRecord({ b: 1 }));
    items.push(storage.createRecord({ b: 2 }));
    expect(items.toArray()).toMatchObject([
      { data: { b: 0 } },
      { data: { b: 1 } },
      { data: { b: 2 } },
    ]);
    assert({
      id: "0:0",
      data: {
        items: [
          {
            id: "1:0",
            data: {
              b: 0,
            },
          },
          {
            id: "1:1",
            data: {
              b: 1,
            },
          },
          {
            id: "1:2",
            data: {
              b: 2,
            },
          },
        ],
      },
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
    const items = root.data.items;
    expect(items.toArray()).toMatchObject([]);

    items.push(doc.createRecord({ b: 0 }));
    expect(items.toArray()).toMatchObject([{ data: { b: 0 } }]);

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
      id: "0:0",
      data: {
        items: [
          {
            id: "0:2",
            data: {
              child: {
                id: "0:3",
                data: {
                  a: 0,
                },
              },
            },
          },
        ],
      },
    });

    storage.root.data.items.delete(0);

    assert({
      id: "0:0",
      data: {
        items: [],
      },
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
    const items = root.data.items;
    items.insert(storage.createRecord({ a: 0 }), 0);

    expect(items.toArray()).toMatchObject([
      { data: { a: 0 } },
      { data: { a: 1 } },
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
    const items = root.data.items;
    items.move(0, 1);

    expect(items.toArray()).toMatchObject([
      { data: { a: 1 } },
      { data: { a: 0 } },
      { data: { a: 2 } },
    ]);
  });

  it.skip("list.push same record should throw", () => {
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
    const items = root.data.items;
    expect(items.toArray()).toMatchObject([]);

    assert({
      id: "0:0",
      data: {
        items: [],
      },
    });

    const record = storage.createRecord({ b: 0 });

    items.push(record);
    expect(() => items.push(record)).toThrow();
  });
});
