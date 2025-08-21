import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { shallow } from "../shallow";

const anything = () =>
  fc.anything({
    withBigInt: true,
    withBoxedValues: true,
    withDate: true,
    withMap: true,
    withNullPrototype: true,
    withObjectString: true,
    withSet: true,
    withTypedArray: true,
    withSparseArray: true,
  });

const scalar = () => fc.jsonValue({ maxDepth: 0 });

const complex = () =>
  anything().filter((value) => value !== null && typeof value === "object");

// Generate some arbitrary values that are "objects" according to JavaScript, but that aren't "pojos".
const nonpojo = () =>
  fc.oneof(
    // Dates
    fc.date(),

    // Sets
    fc.array(fc.anything()).map((items) => new Set(items)),

    // Maps
    fc
      .dictionary(fc.string(), fc.anything())
      .map((d) => new Map(Object.entries(d)))
  );

describe("shallow", () => {
  test("scalar values", () => {
    expect(shallow(0, 0)).toBe(true);
    expect(shallow("", "")).toBe(true);
    expect(shallow("hi", "hi")).toBe(true);
    expect(shallow(false, false)).toBe(true);
    expect(shallow(true, true)).toBe(true);

    expect(shallow(0, 1)).toBe(false);
    expect(shallow(false, true)).toBe(false);
    expect(shallow(true, false)).toBe(false);

    // Weird exceptions
    expect(shallow(NaN, NaN)).toBe(true);
    expect(shallow(-0, +0)).toBe(false);
  });

  test("scalar values wrapped in list", () => {
    expect(shallow([0], [0])).toBe(true);
    expect(shallow([""], [""])).toBe(true);
    expect(shallow(["hi"], ["hi"])).toBe(true);
    expect(shallow([false], [false])).toBe(true);
    expect(shallow([true], [true])).toBe(true);

    expect(shallow([0], [1])).toBe(false);
    expect(shallow([false], [true])).toBe(false);
    expect(shallow([true], [false])).toBe(false);

    // Weird exceptions   ],[
    expect(shallow([NaN], [NaN])).toBe(true);
    expect(shallow([-0], [+0])).toBe(false);
  });

  test("scalar values wrapped in objs", () => {
    expect(shallow({ k: 0 }, { k: 0 })).toBe(true);
    expect(shallow({ k: "" }, { k: "" })).toBe(true);
    expect(shallow({ k: "hi" }, { k: "hi" })).toBe(true);
    expect(shallow({ k: false }, { k: false })).toBe(true);
    expect(shallow({ k: true }, { k: true })).toBe(true);

    expect(shallow({ k: 0 }, { k: 1 })).toBe(false);
    expect(shallow({ k: false }, { k: true })).toBe(false);
    expect(shallow({ k: true }, { k: false })).toBe(false);

    // Weird exceptions
    expect(shallow({ k: NaN }, { k: NaN })).toBe(true);
    expect(shallow({ k: -0 }, { k: +0 })).toBe(false);
  });

  test("different outer types are never equal", () => {
    expect(shallow({}, [])).toBe(false);
    expect(shallow([], {})).toBe(false);
    expect(shallow(new Date(), new Date())).toBe(false);
    expect(shallow(new Date("1970-01-01"), new Date())).toBe(false);
    expect(shallow(new Date(), [])).toBe(false);
    expect(shallow({}, new Date())).toBe(false);
  });

  test("key order does not matter", () => {
    expect(shallow({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  test("different key counts are never equal", () => {
    expect(shallow({ a: undefined, b: 1 }, { b: 1 })).toBe(false);
  });

  test("sparse arrays", () => {
    // Sparse arrays should not break
    /* eslint-disable no-sparse-arrays */
    expect(shallow([,], ["oops", 1])).toBe(false);
    expect(shallow(["oops", 1], [,])).toBe(false);
    expect(shallow([, , ,], [, , ,])).toBe(true);
    expect(shallow([, , , "hi"], [, , , "hi"])).toBe(true);
    /* eslint-enable no-sparse-arrays */
  });
});

describe("shallow (properties)", () => {
  test("all equal scalars are shallowly equal", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.clone(scalar(), 2),

        // Unit test
        ([scalar1, scalar2]) => {
          expect(shallow(scalar1, scalar2)).toBe(true);

          // If two values are shallowly equal, then those values wrapped in an
          // array (one level) should _also_ be considered shallowly equal
          expect(shallow([scalar1], [scalar2])).toBe(true);
          expect(shallow([scalar1, scalar1], [scalar2, scalar2])).toBe(true);

          // ...but wrapping twice is _never_ going to be equal
          expect(shallow([[scalar1]], [[scalar2]])).toBe(false);

          // Ditto for objects
          expect(shallow({ a: scalar1 }, { a: scalar2 })).toBe(true);
          expect(
            shallow({ a: scalar1, b: scalar1 }, { a: scalar2, b: scalar2 })
          ).toBe(true);

          // ...but nesting twice is _never_ going to be equal
          expect(shallow({ a: { b: scalar1 } }, { a: { b: scalar2 } })).toBe(
            false
          );
        }
      )
    );
  });

  test("different scalars are not shallowly equal", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.tuple(scalar(), scalar()).filter(([x, y]) => x !== y),

        // Unit test
        ([scalar1, scalar2]) => {
          expect(shallow(scalar1, scalar2)).toBe(false);

          // If two values are shallowly unequal, then wrapping those in an
          // array (one level) should also always be shallowly unequal
          expect(shallow([scalar1], [scalar2])).toBe(false);

          // Ditto for objects
          expect(shallow({ k: scalar1 }, { k: scalar2 })).toBe(false);
        }
      )
    );
  });

  test("equal composite values", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.clone(complex(), 2),

        // Unit test
        ([complex1, complex2]) => {
          // Property: _if_ two complex values are considered shallowly equal,
          // then wrapping them in an array (one level) will guarantee they're
          // not shallowly equal
          if (shallow(complex1, complex2)) {
            expect(shallow([complex1], [complex2])).toBe(false);
          }

          // Ditto for objects
          if (shallow(complex1, complex2)) {
            expect(shallow({ k: complex1 }, { k: complex2 })).toBe(false);
          }
        }
      )
    );
  });

  test("consistency", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.oneof(
          fc.tuple(anything(), anything()),

          // Add a few clones in the mix too, to ensure we'll have different and equal values
          fc.clone(anything(), 2)
        ),

        // Unit test
        ([value1, value2]) => {
          // _If_ sticking these values in an array makes them shallow-equal,
          // then they should also always be equal without the array wrappers
          if (shallow([value1], [value2])) {
            expect(shallow(value1, value2)).toBe(true);
          }

          if (shallow({ k: value1 }, { k: value2 })) {
            expect(shallow(value1, value2)).toBe(true);
          }
        }
      )
    );
  });

  test("argument ordering does not matter", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.oneof(
          fc.tuple(anything(), anything()),

          // Add a few clones in the mix too, to ensure we'll have different and equal values
          fc.clone(anything(), 2)
        ),

        // Unit test
        ([value1, value2]) => {
          // Order doesn't matter when comparing
          expect(shallow(value1, value2)).toBe(shallow(value2, value1));
        }
      )
    );
  });

  test("date (and other non-pojos) are never considered equal", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.oneof(
          fc.tuple(nonpojo(), nonpojo()),

          // Add a few clones in the mix too, to ensure we'll have different and equal values
          fc.clone(nonpojo(), 2)
        ),

        // Unit test
        ([v1, v2]) => {
          expect(shallow(v1, v2)).toBe(false);
          expect(shallow([v1], [v2])).toBe(false);
          expect(shallow({ k: v1 }, { k: v2 })).toBe(false);
        }
      )
    );
  });
});
