import * as fc from "fast-check";

import { SortedList } from "../SortedList";

const asc = <T>(a: T, b: T) => a < b;
const desc = <T>(a: T, b: T) => b < a;

describe("SortedList", () => {
  test("empty list", () => {
    const s1 = SortedList.from([], asc);
    const s2 = SortedList.fromAlreadySorted([], asc);

    expect(s1.length).toBe(0);
    expect(s2.length).toBe(0);
    expect(Array.from(s1)).toEqual([]);
    expect(Array.from(s2)).toEqual([]);
  });

  test("adding items automatically sorts them (asc)", () => {
    const s = SortedList.from<number>([], asc);
    expect(Array.from(s)).toEqual([]);
    s.add(13);
    expect(Array.from(s)).toEqual([13]);
    s.add(13);
    s.add(42);
    expect(Array.from(s)).toEqual([13, 13, 42]);
    s.add(0);
    s.add(1);
    s.add(-555);
    s.add(88);
    expect(Array.from(s)).toEqual([-555, 0, 1, 13, 13, 42, 88]);
  });

  test("adding items automatically sorts them (desc)", () => {
    const s = SortedList.from<number>([], desc);
    expect(Array.from(s)).toEqual([]);
    s.add(13);
    expect(Array.from(s)).toEqual([13]);
    s.add(13);
    s.add(42);
    expect(Array.from(s)).toEqual([42, 13, 13]);
    s.add(0);
    s.add(1);
    s.add(-555);
    s.add(88);
    expect(Array.from(s)).toEqual([88, 42, 13, 13, 1, 0, -555]);
  });

  test("adding items automatically sorts them (with very custom order)", () => {
    // This orders all odd numbers to the left, and all even numbers to the right
    const cmp = (a: number, b: number) => {
      const oddA = a % 2 !== 0;
      const oddB = b % 2 !== 0;
      return oddA && !oddB ? true : oddB && !oddA ? false : a < b;
    };

    const s = SortedList.from<number>([], cmp);
    expect(Array.from(s)).toEqual([]);
    s.add(13);
    expect(Array.from(s)).toEqual([13]);
    s.add(13);
    s.add(42);
    expect(Array.from(s)).toEqual([13, 13, 42]);
    s.add(0);
    s.add(1);
    s.add(-555);
    s.add(88);
    expect(Array.from(s)).toEqual([-555, 1, 13, 13, 0, 42, 88]);
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

    expect(Array.from(s)).toEqual([-555, 0, 1, 13, 88, 88]);

    expect(s.remove(12)).toEqual(false); // 12 did not exist and was not removed
    expect(s.remove(0)).toEqual(true); // 0 was removed
    expect(s.remove(1)).toEqual(true); // 1 was removed
    expect(s.remove(1)).toEqual(false); // 1 did (no longer) exist

    expect(Array.from(s)).toEqual([-555, 13, 88, 88]);
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

    expect(Array.from(s)).toEqual([88, 88, 13, 1, 0, -555]);

    expect(s.remove(12)).toEqual(false); // 12 did not exist and was not removed
    expect(s.remove(0)).toEqual(true); // 0 was removed
    expect(s.remove(1)).toEqual(true); // 1 was removed
    expect(s.remove(1)).toEqual(false); // 1 did (no longer) exist

    expect(Array.from(s)).toEqual([88, 88, 13, -555]);
  });

  test("filtering items out (asc)", () => {
    const s = SortedList.from([-555, 0, 1, 13, 88, 88], asc);
    expect(Array.from(s.filter((n) => n % 2 === 0))).toEqual([0, 88, 88]);
    expect(Array.from(s.filter((n) => n >= 0))).toEqual([0, 1, 13, 88, 88]);
    expect(Array.from(s.filter((n) => n < 0))).toEqual([-555]);

    expect(Array.from(s.filter(() => true))).toEqual([-555, 0, 1, 13, 88, 88]);
    expect(Array.from(s.filter(() => false))).toEqual([]);
  });

  test("filtering items out (desc)", () => {
    const s = SortedList.from([-555, 0, 1, 13, 88, 88], desc);
    expect(Array.from(s.filter((n) => n % 2 === 0))).toEqual([88, 88, 0]);
    expect(Array.from(s.filter((n) => n >= 0))).toEqual([88, 88, 13, 1, 0]);
    expect(Array.from(s.filter((n) => n < 0))).toEqual([-555]);

    expect(Array.from(s.filter(() => true))).toEqual([88, 88, 13, 1, 0, -555]);
    expect(Array.from(s.filter(() => false))).toEqual([]);
  });

  test("SortedList.from() will sort the input and keep it sorted automatically (asc)", () => {
    expect(Array.from(SortedList.from([3, 1, 2], asc))).toEqual([1, 2, 3]);
    expect(Array.from(SortedList.from(["world", "hello"], asc))).toEqual([
      "hello",
      "world",
    ]);
    expect(
      Array.from(
        SortedList.from(
          [{ id: 1 }, { id: 2 }, { id: -99 }],
          (a, b) => a.id < b.id
        )
      )
    ).toEqual([{ id: -99 }, { id: 1 }, { id: 2 }]);

    fc.assert(
      fc.property(
        fc.array(fc.nat()),

        (arr) => {
          const sortedArr = [...arr].sort((a, b) => a - b);
          expect(Array.from(SortedList.from(arr, asc))).toEqual(sortedArr);
        }
      )
    );
  });

  test("SortedList.from() will sort the input and keep it sorted automatically (desc)", () => {
    expect(Array.from(SortedList.from([3, 1, 2], desc))).toEqual([3, 2, 1]);
    expect(Array.from(SortedList.from(["world", "hello"], desc))).toEqual([
      "world",
      "hello",
    ]);
    expect(
      Array.from(
        SortedList.from(
          [{ id: 1 }, { id: 2 }, { id: -99 }],
          (a, b) => b.id < a.id
        )
      )
    ).toEqual([{ id: 2 }, { id: 1 }, { id: -99 }]);

    fc.assert(
      fc.property(
        fc.array(fc.nat()),

        (arr) => {
          const descSortedArr = [...arr].sort((a, b) => b - a);
          expect(Array.from(SortedList.from(arr, desc))).toEqual(descSortedArr);
        }
      )
    );
  });

  test("Static method .fromAlreadySorted won't sort (garbage in, garbage out)", () => {
    expect(Array.from(SortedList.fromAlreadySorted([3, 1, 2], asc))).toEqual([
      3, 1, 2,
    ]);
    expect(
      Array.from(SortedList.fromAlreadySorted(["world", "hello"], asc))
    ).toEqual(["world", "hello"]);

    fc.assert(
      fc.property(
        fc.array(fc.nat()),

        (arr) => {
          expect(Array.from(SortedList.fromAlreadySorted(arr, asc))).toEqual(
            arr
          );
        }
      )
    );
  });

  test("will keep a sorted list sorted, no matter what elements are added (asc)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat()),
        fc.array(fc.nat()),

        (input, valuesToAdd) => {
          const sortedList = SortedList.from(input, asc); // Our thing
          const jsSortedArr = [...input].sort((a, b) => a - b); // For comparison

          expect(Array.from(sortedList)).toEqual(jsSortedArr);
          for (const value of valuesToAdd) {
            jsSortedArr.push(value);
            jsSortedArr.sort((a, b) => a - b);

            sortedList.add(value);
            expect(Array.from(sortedList)).toEqual(jsSortedArr);
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

          expect(Array.from(sortedList)).toEqual(jsDescSortedArr);
          for (const value of valuesToAdd) {
            jsDescSortedArr.push(value);
            jsDescSortedArr.sort((a, b) => b - a);

            sortedList.add(value);
            expect(Array.from(sortedList)).toEqual(jsDescSortedArr);
          }
        }
      )
    );
  });

  test("test with more complex data structures (asc)", () => {
    const thread = fc.record({ id: fc.nat(), updatedAt: fc.date() });

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

          expect(Array.from(sortedList)).toEqual(jsSortedArr);
          for (const newThread of threadsToAdd) {
            jsSortedArr.push(newThread);
            jsSortedArr.sort(
              (t1, t2) => t1.updatedAt.getTime() - t2.updatedAt.getTime()
            ); // For comparison

            sortedList.add(newThread);
            expect(Array.from(sortedList)).toEqual(jsSortedArr);
          }
        }
      )
    );
  });

  test("test with more complex data structures (desc)", () => {
    const thread = fc.record({ id: fc.nat(), updatedAt: fc.date() });

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

          expect(Array.from(sortedList)).toEqual(jsDescSortedArr);
          for (const newThread of threadsToAdd) {
            jsDescSortedArr.push(newThread);
            jsDescSortedArr.sort(
              (t1, t2) => t2.updatedAt.getTime() - t1.updatedAt.getTime()
            ); // For comparison

            sortedList.add(newThread);
            expect(Array.from(sortedList)).toEqual(jsDescSortedArr);
          }
        }
      )
    );
  });
});
