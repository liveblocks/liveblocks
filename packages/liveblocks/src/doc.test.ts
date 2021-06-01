import { Record, Doc, createRecord, createList, RecordData } from "./doc";

describe("Doc", () => {
  let counter = 0;

  function makeRecord<T extends RecordData>(data: T): Record<T> {
    return createRecord(`0:${counter++}`, data);
  }

  function makeList<T>(items?: T[]) {
    return createList<T>(`0:${counter++}`, items);
  }

  beforeEach(() => {
    counter = 0;
  });

  describe("updateRecord", () => {
    it("update root", () => {
      let doc = Doc.createFromRoot({ a: 0, b: 0 });
      expect(doc.data).toMatchObject({ a: 0, b: 0 });

      doc = doc.updateRecord(doc.root.id, { a: 1 });
      expect(doc.data).toMatchObject({ a: 1, b: 0 });

      doc = doc.updateRecord(doc.root.id, { a: 2, b: 2 });
      expect(doc.data).toMatchObject({ a: 2, b: 2 });
    });

    it("should support null properties", () => {
      let doc = Doc.createFromRoot({ a: 0 });
      expect(doc.data).toMatchObject({ a: 0 });

      doc = doc.updateRecord(doc.root.id, { a: null });
      expect(doc.data).toMatchObject({ a: null });

      doc = doc.updateRecord(doc.root.id, { a: 0 });
      expect(doc.data).toMatchObject({ a: 0 });
    });

    it("update nested record", () => {
      let doc = Doc.createFromRoot({
        a: 0,
        child: makeRecord({
          b: 0,
        }),
      });
      const child = doc.data.child;
      doc = doc.updateRecord(child.id, { b: 1 });
      expect(doc.data).toMatchObject({ a: 0, child: { b: 1 } });
    });

    it("update nested record in list", () => {
      const items = makeList<Record<{ x: number }>>();
      let doc = Doc.createFromRoot({ items });
      expect(doc.data.items.toArray()).toMatchObject([]);

      const item = makeRecord({ x: 1 });
      doc = doc.pushItem(items.id, item);
      expect(doc.data.items.toArray()).toMatchObject([{ x: 1 }]);

      doc = doc.updateRecord(item.id, { x: 2 });
      expect(doc.data.items.toArray()).toMatchObject([{ x: 2 }]);
    });

    it("update deeply nested record", () => {
      let doc = Doc.createFromRoot({
        a: 0,
        child: makeRecord({
          b: 0,
          grandChild: makeRecord({
            c: 0,
          }),
        }),
      });

      const grandChild = doc.data.child.grandChild;
      doc = doc.updateRecord(grandChild.id, { c: 1 });
      expect(doc.data.child.grandChild.c).toEqual(1);
    });
  });

  describe("list", () => {
    test("empty list", () => {
      const items = makeList<Record<{ x: number }>>();
      let doc = Doc.createFromRoot({ items });
      expect(doc.data.items.toArray()).toEqual([]);
    });

    test("pushItem", () => {
      const items = makeList<Record<{ x: number }>>();
      let doc = Doc.createFromRoot({ items });
      expect(doc.data.items.toArray()).toEqual([]);

      doc = doc.pushItem(items.id, makeRecord({ x: 1 }));
      expect(doc.data.items.toArray()).toMatchObject([{ x: 1 }]);

      doc = doc.pushItem(items.id, makeRecord({ x: 2 }));
      expect(doc.data.items.toArray()).toMatchObject([{ x: 1 }, { x: 2 }]);

      doc = doc.pushItem(items.id, makeRecord({ x: 3 }));
      expect(doc.data.items.toArray()).toMatchObject([
        { x: 1 },
        { x: 2 },
        { x: 3 },
      ]);
    });

    test("moveItem", () => {
      const items = makeList<Record<{ x: number }>>();
      let doc = Doc.createFromRoot({ items });
      doc = doc.pushItem(items.id, makeRecord({ x: 1 }));
      doc = doc.pushItem(items.id, makeRecord({ x: 2 }));
      doc = doc.pushItem(items.id, makeRecord({ x: 3 }));

      doc = doc.moveItem(items.id, 2, 0);
      expect(doc.data.items.toArray()).toMatchObject([
        { x: 3 },
        { x: 1 },
        { x: 2 },
      ]);

      doc = doc.moveItem(items.id, 0, 2);
      expect(doc.data.items.toArray()).toMatchObject([
        { x: 1 },
        { x: 2 },
        { x: 3 },
      ]);
    });

    test("deleteItem", () => {
      const items = makeList<Record<{ x: number }>>();
      let doc = Doc.createFromRoot({ items });
      doc = doc.pushItem(items.id, makeRecord({ x: 1 }));
      doc = doc.pushItem(items.id, makeRecord({ x: 2 }));
      doc = doc.pushItem(items.id, makeRecord({ x: 3 }));

      doc = doc.deleteItem(items.id, 1);
      expect(doc.data.items.toArray()).toMatchObject([{ x: 1 }, { x: 3 }]);
    });

    test("deleteItemById", () => {
      const items = makeList<Record<{ x: number }>>();
      let doc = Doc.createFromRoot({ items });
      const firstItem = makeRecord({ x: 1 });
      doc = doc.pushItem(items.id, firstItem);
      doc = doc.pushItem(items.id, makeRecord({ x: 2 }));
      doc = doc.pushItem(items.id, makeRecord({ x: 3 }));

      doc = doc.deleteItemById(items.id, firstItem.id);
      expect(doc.data.items.toArray()).toMatchObject([{ x: 2 }, { x: 3 }]);
    });

    // test("create list with items", () => {
    //   const items = makeList<Record<{ x: number }>>([
    //     makeRecord({ x: 1 }),
    //     makeRecord({ x: 2 }),
    //     makeRecord({ x: 3 }),
    //   ]);
    //   let doc = Doc.createFromRoot({ items });

    //   expect(doc.data.items.toArray()).toMatchObject([
    //     { x: 1 },
    //     { x: 2 },
    //     { x: 3 },
    //   ]);
    // });
  });
});
