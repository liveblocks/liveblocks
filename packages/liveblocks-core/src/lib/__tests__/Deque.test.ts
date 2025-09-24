import * as fc from "fast-check";
import { assertEq } from "tosti";
import { describe, test } from "vitest";

import { Deque } from "../Deque";

describe("Deque", () => {
  test("empty", () => {
    const deque = new Deque<string>();
    assertEq(deque.length, 0);
    assertEq(Array.from(deque), []);
  });

  test("one push & pop", () => {
    const deque = new Deque<string>();
    deque.push("A");
    assertEq(deque.pop(), "A");
  });

  test("push & pop multiple times", () => {
    const deque = new Deque<string>();
    deque.push("A");
    deque.push("B");
    assertEq(deque.pop(), "B");
    assertEq(deque.pop(), "A");
  });

  test("one pushLeft & popLeft", () => {
    const deque = new Deque<string>();
    deque.pushLeft("A");
    assertEq(deque.popLeft(), "A");
  });

  test("pushLeft & popLeft multiple times", () => {
    const deque = new Deque<string>();
    deque.pushLeft("A");
    deque.pushLeft("B");
    assertEq(deque.popLeft(), "B");
    assertEq(deque.popLeft(), "A");
  });

  test("pushLeft & popRight is like a queue", () => {
    const deque = new Deque<string>();
    deque.pushLeft("A");
    deque.pushLeft("B");
    assertEq(deque.pop(), "A");
    assertEq(deque.pop(), "B");
  });

  test("push & pop", () => {
    const deque = new Deque<string>();
    assertEq(deque.length, 0);

    deque.push("hello");
    assertEq(deque.length, 1);

    deque.push("foo");
    assertEq(deque.length, 2);

    deque.push("bar");
    assertEq(deque.length, 3);

    assertEq(deque.pop(), "bar");
    assertEq(deque.length, 2);

    deque.push("baz");
    assertEq(deque.length, 3);

    assertEq(deque.pop(), "baz");
    assertEq(deque.length, 2);

    assertEq(deque.pop(), "foo");
    assertEq(deque.length, 1);

    assertEq(deque.pop(), "hello");
    assertEq(deque.length, 0);

    assertEq(deque.pop(), undefined);
    assertEq(deque.length, 0);
  });

  test("iteration", () => {
    const deque = new Deque<string>();
    deque.push("one");
    deque.push("two");
    deque.push("three");
    assertEq(Array.from(deque), ["one", "two", "three"]);
  });

  test("push, pop, then iterate", () => {
    const deque = new Deque<string>();

    assertEq(deque.length, 0);
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

    assertEq(deque.length, 3);
    assertEq(Array.from(deque), ["hello", "foo", "bar"]);

    deque.pop();
    deque.pop();
    deque.pop();
    deque.pop();

    assertEq(deque.length, 0);
    assertEq(Array.from(deque), []);
  });

  test("push many values", () => {
    const deque1 = new Deque<string>();
    deque1.push("hello");
    deque1.push("foo");
    deque1.push("bar");
    const deque2 = new Deque<string>();
    deque2.push(["hello", "foo", "bar"]);
    assertEq(Array.from(deque1), Array.from(deque2));
  });

  test("pushLeft many values", () => {
    const deque1 = new Deque<string>();
    deque1.pushLeft("hello");
    deque1.pushLeft("foo");
    deque1.pushLeft("bar");
    const deque2 = new Deque<string>();
    deque2.pushLeft(["bar", "foo", "hello"]);
    assertEq(Array.from(deque1), Array.from(deque2));
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
              assertEq(expected.pop(), deque.pop());
            }
          }

          const actual = Array.from(deque);
          assertEq(actual, expected);
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
              assertEq(expected.shift(), deque.popLeft());
            }
          }

          const actual = Array.from(deque);
          assertEq(actual, expected);
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
              assertEq(deque1.pop(), deque2.popLeft());
            }
          }

          assertEq(Array.from(deque1), Array.from(deque2).reverse());
        }
      )
    );
  });
});
