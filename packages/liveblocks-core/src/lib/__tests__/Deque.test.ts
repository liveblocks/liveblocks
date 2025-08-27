import * as fc from "fast-check";
import { describe, expect, test } from "vitest";

import { Deque } from "../Deque";

describe("Deque", () => {
  test("empty", () => {
    const deque = new Deque<string>();
    expect(deque.length).toEqual(0);
    expect(Array.from(deque)).toEqual([]);
  });

  test("one push & pop", () => {
    const deque = new Deque<string>();
    deque.push("A");
    expect(deque.pop()).toEqual("A");
  });

  test("push & pop multiple times", () => {
    const deque = new Deque<string>();
    deque.push("A");
    deque.push("B");
    expect(deque.pop()).toEqual("B");
    expect(deque.pop()).toEqual("A");
  });

  test("one pushLeft & popLeft", () => {
    const deque = new Deque<string>();
    deque.pushLeft("A");
    expect(deque.popLeft()).toEqual("A");
  });

  test("pushLeft & popLeft multiple times", () => {
    const deque = new Deque<string>();
    deque.pushLeft("A");
    deque.pushLeft("B");
    expect(deque.popLeft()).toEqual("B");
    expect(deque.popLeft()).toEqual("A");
  });

  test("pushLeft & popRight is like a queue", () => {
    const deque = new Deque<string>();
    deque.pushLeft("A");
    deque.pushLeft("B");
    expect(deque.pop()).toEqual("A");
    expect(deque.pop()).toEqual("B");
  });

  test("push & pop", () => {
    const deque = new Deque<string>();
    expect(deque.length).toEqual(0);

    deque.push("hello");
    expect(deque.length).toEqual(1);

    deque.push("foo");
    expect(deque.length).toEqual(2);

    deque.push("bar");
    expect(deque.length).toEqual(3);

    expect(deque.pop()).toEqual("bar");
    expect(deque.length).toEqual(2);

    deque.push("baz");
    expect(deque.length).toEqual(3);

    expect(deque.pop()).toEqual("baz");
    expect(deque.length).toEqual(2);

    expect(deque.pop()).toEqual("foo");
    expect(deque.length).toEqual(1);

    expect(deque.pop()).toEqual("hello");
    expect(deque.length).toEqual(0);

    expect(deque.pop()).toEqual(undefined);
    expect(deque.length).toEqual(0);
  });

  test("iteration", () => {
    const deque = new Deque<string>();
    deque.push("one");
    deque.push("two");
    deque.push("three");
    expect(Array.from(deque)).toEqual(["one", "two", "three"]);
  });

  test("push, pop, then iterate", () => {
    const deque = new Deque<string>();

    expect(deque.length).toEqual(0);
    deque.push("hello");
    deque.push("foo");
    deque.push("bar");
    deque.pop();
    deque.pop();
    deque.pop();
    deque.pop();
    deque.pop();
    deque.pop();
    deque.push("foo");
    deque.pop();
    deque.push("hello");
    deque.push("foo");
    deque.push("bar");

    expect(deque.length).toEqual(3);
    expect(Array.from(deque)).toEqual(["hello", "foo", "bar"]);

    deque.pop();
    deque.pop();
    deque.pop();
    deque.pop();

    expect(deque.length).toEqual(0);
    expect(Array.from(deque)).toEqual([]);
  });

  test("push many values", () => {
    const deque1 = new Deque<string>();
    deque1.push("hello");
    deque1.push("foo");
    deque1.push("bar");
    const deque2 = new Deque<string>();
    deque2.push(["hello", "foo", "bar"]);
    expect(Array.from(deque1)).toEqual(Array.from(deque2));
  });

  test("pushLeft many values", () => {
    const deque1 = new Deque<string>();
    deque1.pushLeft("hello");
    deque1.pushLeft("foo");
    deque1.pushLeft("bar");
    const deque2 = new Deque<string>();
    deque2.pushLeft(["bar", "foo", "hello"]);
    expect(Array.from(deque1)).toEqual(Array.from(deque2));
  });
});

describe("Deque properties", () => {
  const sequenceOfOps = () =>
    fc.array(
      fc.oneof(
        fc.tuple<["remove", null]>(fc.constant("remove"), fc.constant(null)),
        fc.tuple<["add", unknown[]]>(
          fc.constant("add"),
          fc.array(
            fc.oneof(
              { withCrossShrink: true },
              fc.constantFrom("A", "B", "C", "D", "E"),
              fc.string()
            )
          )
        )
      )
    );

  test("normal popping and pushing behaves like a normal array", () => {
    fc.assert(
      fc.property(
        sequenceOfOps(),

        (seq) => {
          const expected = [];
          const deque = new Deque();

          for (const [op, values] of seq) {
            if (op === "add") {
              expected.push(...values);
              deque.push(values);
            } else {
              expect(expected.pop()).toEqual(deque.pop());
            }
          }

          const actual = Array.from(deque);
          expect(actual).toEqual(expected);
        }
      )
    );
  });

  test("popping and pushing from the left cannot be distinguished from array shift/unshift ops", () => {
    fc.assert(
      fc.property(
        sequenceOfOps(),

        (seq) => {
          const expected = [];
          const deque = new Deque();

          for (const [op, values] of seq) {
            if (op === "add") {
              expected.unshift(...values);
              deque.pushLeft(values);
            } else {
              expect(expected.shift()).toEqual(deque.popLeft());
            }
          }

          const actual = Array.from(deque);
          expect(actual).toEqual(expected);
        }
      )
    );
  });

  test("popping and pushing from the left or from the right returns the same data, but reversed", () => {
    fc.assert(
      fc.property(
        sequenceOfOps(),

        (seq) => {
          const deque1 = new Deque();
          const deque2 = new Deque();

          for (const [op, values] of seq) {
            if (op === "add") {
              deque1.push(values);
              deque2.pushLeft(values.reverse());
            } else {
              expect(deque1.pop()).toEqual(deque2.popLeft());
            }
          }

          expect(Array.from(deque1)).toEqual(Array.from(deque2).reverse());
        }
      )
    );
  });
});
