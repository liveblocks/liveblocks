import * as fc from "fast-check";
import { assertEq, assertSame } from "tosti";
import { describe, test } from "vitest";

import { SortedList } from "../SortedList";

const asc = <T>(a: T, b: T) => a < b;
const desc = <T>(a: T, b: T) => b < a;

describe("SortedList", () => {
  test("empty list", () => {
    const s1 = SortedList.from([], asc);
    const s2 = SortedList.fromAlreadySorted([], asc);

    assertSame(s1.length, 0);
    assertSame(s2.length, 0);
    assertEq(Array.from(s1), []);
    assertEq(Array.from(s2), []);
  });

  test("adding items automatically sorts them (asc)", () => {
    const s = SortedList.from<number>([], asc);
    assertEq(Array.from(s), []);
    s.add(13);
    assertEq(Array.from(s), [13]);
    s.add(13);
    s.add(42);
    assertEq(Array.from(s), [13, 13, 42]);
    s.add(0);
    s.add(1);
    s.add(-555);
    s.add(88);
    assertEq(Array.from(s), [-555, 0, 1, 13, 13, 42, 88]);
  });

  test("adding items automatically sorts them (desc)", () => {
    const s = SortedList.from<number>([], desc);
    assertEq(Array.from(s), []);
    s.add(13);
    assertEq(Array.from(s), [13]);
    s.add(13);
    s.add(42);
    assertEq(Array.from(s), [42, 13, 13]);
    s.add(0);
    s.add(1);
    s.add(-555);
    s.add(88);
    assertEq(Array.from(s), [88, 42, 13, 13, 1, 0, -555]);
  });

  test("adding items automatically sorts them (with very custom order)", () => {
    // This orders all odd numbers to the left, and all even numbers to the right
    const cmp = (a: number, b: number) => {
      const oddA = a % 2 !== 0;
      const oddB = b % 2 !== 0;
      return oddA && !oddB ? true : oddB && !oddA ? false : a < b;
    };

    const s = SortedList.from<number>([], cmp);
    assertEq(Array.from(s), []);
    s.add(13);
    assertEq(Array.from(s), [13]);
    s.add(13);
    s.add(42);
    assertEq(Array.from(s), [13, 13, 42]);
    s.add(0);
    s.add(1);
    s.add(-555);
    s.add(88);
    assertEq(Array.from(s), [-555, 1, 13, 13, 0, 42, 88]);
  });

  test("removing items keeps things sorted (asc)", () => {
    const s = SortedList.from(
      [1, -555, 88, Math.PI, 88, 0, 13, 42, 88, 13],
      asc
    );
    s.remove(88);
    s.remove(13);
    s.remove(Math.PI);
    s.remove(42);

    assertEq(Array.from(s), [-555, 0, 1, 13, 88, 88]);

    assertEq(s.remove(12), false); // 12 did not exist and was not removed
    assertEq(s.remove(0), true); // 0 was removed
    assertEq(s.remove(1), true); // 1 was removed
    assertEq(s.remove(1), false); // 1 did (no longer) exist

    assertEq(Array.from(s), [-555, 13, 88, 88]);
  });

  test("removing all items (clear)", () => {
    const s = SortedList.from(
      [1, -555, 88, Math.PI, 88, 0, 13, 42, 88, 13],
      asc
    );
    assertEq(s.clear(), true); // was mutated
    assertEq(Array.from(s), []);
    assertEq(s.clear(), false); // was not mutated
    assertEq(Array.from(s), []);
  });

  test("removing items by predicate (without limit)", () => {
    const s = SortedList.from(
      [1, -555, 88, Math.PI, 88, 0, 13, 42, 88, 13],
      asc
    );
    s.removeBy((n) => n % 2 !== 0);
    assertEq(Array.from(s), [0, 42, 88, 88, 88]);
  });

  test("removing items by predicate (with limit=2)", () => {
    const s = SortedList.from(
      [1, -555, 88, Math.PI, 88, 0, 13, 42, 88, 13],
      asc
    );
    s.removeBy((n) => n % 2 !== 0, /* limit */ 2);
    assertEq(Array.from(s), [0, Math.PI, 13, 13, 42, 88, 88, 88]);
  });

  test("removing items by predicate (with limit=3)", () => {
    const s = SortedList.from(
      [1, -555, 88, Math.PI, 88, 0, 13, 42, 88, 13],
      asc
    );
    s.removeBy((n) => n % 2 !== 0, /* limit */ 3);
    assertEq(Array.from(s), [0, 13, 13, 42, 88, 88, 88]);
  });

  test("removing items keeps things sorted (desc)", () => {
    const s = SortedList.from(
      [1, -555, 88, Math.PI, 88, 0, 13, 42, 88, 13],
      desc
    );
    s.remove(88);
    s.remove(13);
    s.remove(Math.PI);
    s.remove(42);

    assertEq(Array.from(s), [88, 88, 13, 1, 0, -555]);

    assertEq(s.remove(12), false); // 12 did not exist and was not removed
    assertEq(s.remove(0), true); // 0 was removed
    assertEq(s.remove(1), true); // 1 was removed
    assertEq(s.remove(1), false); // 1 did (no longer) exist

    assertEq(Array.from(s), [88, 88, 13, -555]);
  });

  test("filtering items out (asc)", () => {
    const s = SortedList.from([-555, 0, 1, 13, 88, 88], asc);
    assertEq(Array.from(s.filter((n) => n % 2 === 0)), [0, 88, 88]);
    assertEq(Array.from(s.filter((n) => n >= 0)), [0, 1, 13, 88, 88]);
    assertEq(Array.from(s.filter((n) => n < 0)), [-555]);

    assertEq(Array.from(s.filter(() => true)), [-555, 0, 1, 13, 88, 88]);
    assertEq(Array.from(s.filter(() => false)), []);
  });

  test("filtering items out (desc)", () => {
    const s = SortedList.from([-555, 0, 1, 13, 88, 88], desc);
    assertEq(Array.from(s.filter((n) => n % 2 === 0)), [88, 88, 0]);
    assertEq(Array.from(s.filter((n) => n >= 0)), [88, 88, 13, 1, 0]);
    assertEq(Array.from(s.filter((n) => n < 0)), [-555]);

    assertEq(Array.from(s.filter(() => true)), [88, 88, 13, 1, 0, -555]);
    assertEq(Array.from(s.filter(() => false)), []);
  });

  test("find", () => {
    const s1 = SortedList.from([-555, 0, 1, 13, 88, 88], asc);
    assertEq(
      s1.find((n) => n > 1),
      13
    );
    assertEq(
      s1.find((n) => n === 17),
      undefined
    );
    const s2 = SortedList.from([-555, 0, 1, 13, 88, 88], desc);
    assertEq(
      s2.find((n) => n > 1),
      88
    );
    assertEq(
      s2.find((n) => n === 17),
      undefined
    );
  });

  test("find with start index", () => {
    const s1 = SortedList.from([-555, 0, 1, 13, 88, 88], asc);
    assertEq(
      s1.find((n) => n > 1, -99),
      13
    );
    assertEq(
      s1.find((n) => n > 1, 0),
      13
    );
    assertEq(
      s1.find((n) => n > 1, 1),
      13
    );
    assertEq(
      s1.find((n) => n > 1, 2),
      13
    );
    assertEq(
      s1.find((n) => n > 1, 3),
      13
    );
    assertEq(
      s1.find((n) => n === 17, 3),
      undefined
    );
    const s2 = SortedList.from([-555, 0, 1, 13, 88, 88], desc);
    assertEq(
      s2.find((n) => n > 1, -99),
      88
    );
    assertEq(
      s2.find((n) => n > 1, 0),
      88
    );
    assertEq(
      s2.find((n) => n > 1, 1),
      88
    );
    assertEq(
      s2.find((n) => n > 1, 2),
      13
    );
    assertEq(
      s2.find((n) => n > 1, 3),
      undefined
    );
    assertEq(
      s2.find((n) => n === 17, 3),
      undefined
    );
  });

  test("at", () => {
    const s1 = SortedList.from([0, 88, 1, -555, 13, 88], asc);
    assertEq(s1.at(-1), undefined);
    assertEq(s1.at(0), -555);
    assertEq(s1.at(1), 0);
    assertEq(s1.at(2), 1);
    assertEq(s1.at(3), 13);
    assertEq(s1.at(4), 88);
    assertEq(s1.at(5), 88);
    assertEq(s1.at(6), undefined);

    const s2 = SortedList.from([0, 88, 1, -555, 13, 88], desc);
    assertEq(s2.at(-1), undefined);
    assertEq(s2.at(0), 88);
    assertEq(s2.at(1), 88);
    assertEq(s2.at(2), 13);
    assertEq(s2.at(3), 1);
    assertEq(s2.at(4), 0);
    assertEq(s2.at(5), -555);
    assertEq(s2.at(6), undefined);
  });

  test("findRightmost", () => {
    const s1 = SortedList.from([-555, 0, 1, 13, 88, 88], asc);
    assertEq(
      s1.findRight((n) => n <= 0),
      0
    );
    assertEq(
      s1.findRight((n) => n > 1),
      88
    );
    assertEq(
      s1.findRight((n) => n === 17),
      undefined
    );
    const s2 = SortedList.from([-555, 0, 1, 13, 88, 88], desc);
    assertEq(
      s2.findRight((n) => n <= 0),
      -555
    );
    assertEq(
      s2.findRight((n) => n > 1),
      13
    );
    assertEq(
      s2.findRight((n) => n === 17),
      undefined
    );
  });

  test("findRightmost with start index", () => {
    const s1 = SortedList.from([-555, 0, 1, 13, 88, 88], asc);
    assertEq(
      s1.findRight((n) => n <= 0, 999),
      0
    );
    assertEq(
      s1.findRight((n) => n <= 0, 7),
      0
    );
    assertEq(
      s1.findRight((n) => n <= 0, 6),
      0
    );
    assertEq(
      s1.findRight((n) => n <= 0, 5),
      0
    );
    assertEq(
      s1.findRight((n) => n <= 0, 4),
      0
    );
    const s2 = SortedList.from([-555, 0, 1, 13, 88, 88], desc);
    assertEq(
      s2.findRight((n) => n <= 0, 999),
      -555
    );
    assertEq(
      s2.findRight((n) => n <= 0, 7),
      -555
    );
    assertEq(
      s2.findRight((n) => n <= 0, 6),
      -555
    );
    assertEq(
      s2.findRight((n) => n <= 0, 5),
      -555
    );
    assertEq(
      s2.findRight((n) => n <= 0, 4),
      0
    );
    assertEq(
      s2.findRight((n) => n <= 0, 3),
      undefined
    );
  });

  test("accessing the raw internal array", () => {
    const s1 = SortedList.from([3, 6, 7, 1, 0, 1, 0, 99, -13, -1], asc);
    assertEq(s1.rawArray, [-13, -1, 0, 0, 1, 1, 3, 6, 7, 99]);

    const s2 = SortedList.from([3, 6, 7, 1, 0, 1, 0, 99, -13, -1], desc);
    assertEq(s2.rawArray, [99, 7, 6, 3, 1, 1, 0, 0, -1, -13]);
  });

  test("cloning sorted lists", () => {
    const s1 = SortedList.from([3, 6, 7, 1, 0, 1, 0, 99, -13, -1], asc);
    s1.add(42);

    const s2 = s1.clone();
    s2.remove(0);
    s2.remove(0);
    s2.remove(1);
    s2.remove(1);
    s2.add(777777);

    assertEq(Array.from(s1), [-13, -1, 0, 0, 1, 1, 3, 6, 7, 42, 99]);
    assertEq(Array.from(s2), [-13, -1, 3, 6, 7, 42, 99, 777777]);
  });

  test("SortedList.from() will sort the input and keep it sorted automatically (asc)", () => {
    assertEq(Array.from(SortedList.from([3, 1, 2], asc)), [1, 2, 3]);
    assertEq(Array.from(SortedList.from(["world", "hello"], asc)), [
      "hello",
      "world",
    ]);
    assertEq(
      Array.from(
        SortedList.from(
          [{ id: 1 }, { id: 2 }, { id: -99 }],
          (a, b) => a.id < b.id
        )
      ),
      [{ id: -99 }, { id: 1 }, { id: 2 }]
    );

    fc.assert(
      fc.property(
        fc.array(fc.nat()),

        (arr) => {
          const sortedArr = [...arr].sort((a, b) => a - b);
          assertEq(Array.from(SortedList.from(arr, asc)), sortedArr);
        }
      )
    );
  });

  test("SortedList.from() will sort the input and keep it sorted automatically (desc)", () => {
    assertEq(Array.from(SortedList.from([3, 1, 2], desc)), [3, 2, 1]);
    assertEq(Array.from(SortedList.from(["world", "hello"], desc)), [
      "world",
      "hello",
    ]);
    assertEq(
      Array.from(
        SortedList.from(
          [{ id: 1 }, { id: 2 }, { id: -99 }],
          (a, b) => b.id < a.id
        )
      ),
      [{ id: 2 }, { id: 1 }, { id: -99 }]
    );

    fc.assert(
      fc.property(
        fc.array(fc.nat()),

        (arr) => {
          const descSortedArr = [...arr].sort((a, b) => b - a);
          assertEq(Array.from(SortedList.from(arr, desc)), descSortedArr);
        }
      )
    );
  });

  test("Static method .fromAlreadySorted won't sort (garbage in, garbage out)", () => {
    assertEq(
      Array.from(SortedList.fromAlreadySorted([3, 1, 2], asc)),
      [3, 1, 2]
    );
    assertEq(
      Array.from(SortedList.fromAlreadySorted(["world", "hello"], asc)),
      ["world", "hello"]
    );

    fc.assert(
      fc.property(
        fc.array(fc.nat()),

        (arr) => {
          assertEq(Array.from(SortedList.fromAlreadySorted(arr, asc)), arr);
        }
      )
    );
  });

  test("Static convenience method .with() produces empty lists", () => {
    assertEq(Array.from(SortedList.with(asc)), []);
    assertEq(Array.from(SortedList.with(desc)), []);
  });

  test("will keep a sorted list sorted, no matter what elements are added (asc)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat()),
        fc.array(fc.nat()),

        (input, valuesToAdd) => {
          const sortedList = SortedList.from(input, asc); // Our thing
          const jsSortedArr = [...input].sort((a, b) => a - b); // For comparison

          assertEq(Array.from(sortedList), jsSortedArr);
          for (const value of valuesToAdd) {
            jsSortedArr.push(value);
            jsSortedArr.sort((a, b) => a - b);

            sortedList.add(value);
            assertEq(Array.from(sortedList), jsSortedArr);
          }
        }
      )
    );
  });

  test("will keep a sorted list sorted, no matter what elements are added (desc)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat()),
        fc.array(fc.nat()),

        (input, valuesToAdd) => {
          const sortedList = SortedList.from(input, desc); // Our thing
          const jsDescSortedArr = [...input].sort((a, b) => b - a); // For comparison

          assertEq(Array.from(sortedList), jsDescSortedArr);
          for (const value of valuesToAdd) {
            jsDescSortedArr.push(value);
            jsDescSortedArr.sort((a, b) => b - a);

            sortedList.add(value);
            assertEq(Array.from(sortedList), jsDescSortedArr);
          }
        }
      )
    );
  });

  test("test with more complex data structures (asc)", () => {
    const thread = fc.record({
      id: fc.nat(),
      updatedAt: fc.date({ noInvalidDate: true }),
    });

    fc.assert(
      fc.property(
        fc.array(thread, { maxLength: 10_000 }),
        fc.array(thread, { maxLength: 10_000 }),

        (threads, threadsToAdd) => {
          const sortedList = SortedList.from(
            threads,
            (t1, t2) => t1.updatedAt < t2.updatedAt
          ); // Our thing
          const jsSortedArr = [...threads].sort(
            (t1, t2) => t1.updatedAt.getTime() - t2.updatedAt.getTime()
          ); // For comparison

          assertEq(Array.from(sortedList), jsSortedArr);
          for (const newThread of threadsToAdd) {
            jsSortedArr.push(newThread);
            jsSortedArr.sort(
              (t1, t2) => t1.updatedAt.getTime() - t2.updatedAt.getTime()
            ); // For comparison

            sortedList.add(newThread);
            assertEq(Array.from(sortedList), jsSortedArr);
          }
        }
      )
    );
  });

  test("test with more complex data structures (desc)", () => {
    const thread = fc.record({
      id: fc.nat(),
      updatedAt: fc.date({ noInvalidDate: true }),
    });

    fc.assert(
      fc.property(
        fc.array(thread, { maxLength: 10_000 }),
        fc.array(thread, { maxLength: 10_000 }),

        (threads, threadsToAdd) => {
          const sortedList = SortedList.from(
            threads,
            (t1, t2) => t2.updatedAt < t1.updatedAt
          ); // Our thing
          const jsDescSortedArr = [...threads].sort(
            (t1, t2) => t2.updatedAt.getTime() - t1.updatedAt.getTime()
          ); // For comparison

          assertEq(Array.from(sortedList), jsDescSortedArr);
          for (const newThread of threadsToAdd) {
            jsDescSortedArr.push(newThread);
            jsDescSortedArr.sort(
              (t1, t2) => t2.updatedAt.getTime() - t1.updatedAt.getTime()
            ); // For comparison

            sortedList.add(newThread);
            assertEq(Array.from(sortedList), jsDescSortedArr);
          }
        }
      )
    );
  });
});
