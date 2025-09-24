import fc from "fast-check";
import { assertSame } from "tosti";
import { describe, test } from "vitest";

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
    assertSame(shallow(0, 0), true);
    assertSame(shallow("", ""), true);
    assertSame(shallow("hi", "hi"), true);
    assertSame(shallow(false, false), true);
    assertSame(shallow(true, true), true);

    assertSame(shallow(0, 1), false);
    assertSame(shallow(false, true), false);
    assertSame(shallow(true, false), false);

    // Weird exceptions
    assertSame(shallow(NaN, NaN), true);
    assertSame(shallow(-0, +0), false);
  });

  test("scalar values wrapped in list", () => {
    assertSame(shallow([0], [0]), true);
    assertSame(shallow([""], [""]), true);
    assertSame(shallow(["hi"], ["hi"]), true);
    assertSame(shallow([false], [false]), true);
    assertSame(shallow([true], [true]), true);

    assertSame(shallow([0], [1]), false);
    assertSame(shallow([false], [true]), false);
    assertSame(shallow([true], [false]), false);

    // Weird exceptions   ],[
    assertSame(shallow([NaN], [NaN]), true);
    assertSame(shallow([-0], [+0]), false);
  });

  test("scalar values wrapped in objs", () => {
    assertSame(shallow({ k: 0 }, { k: 0 }), true);
    assertSame(shallow({ k: "" }, { k: "" }), true);
    assertSame(shallow({ k: "hi" }, { k: "hi" }), true);
    assertSame(shallow({ k: false }, { k: false }), true);
    assertSame(shallow({ k: true }, { k: true }), true);

    assertSame(shallow({ k: 0 }, { k: 1 }), false);
    assertSame(shallow({ k: false }, { k: true }), false);
    assertSame(shallow({ k: true }, { k: false }), false);

    // Weird exceptions
    assertSame(shallow({ k: NaN }, { k: NaN }), true);
    assertSame(shallow({ k: -0 }, { k: +0 }), false);
  });

  test("different outer types are never equal", () => {
    assertSame(shallow({}, []), false);
    assertSame(shallow([], {}), false);
    assertSame(shallow(new Date(), new Date()), false);
    assertSame(shallow(new Date("1970-01-01"), new Date()), false);
    assertSame(shallow(new Date(), []), false);
    assertSame(shallow({}, new Date()), false);
  });

  test("key order does not matter", () => {
    assertSame(shallow({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  });

  test("different key counts are never equal", () => {
    assertSame(shallow({ a: undefined, b: 1 }, { b: 1 }), false);
  });

  test("sparse arrays", () => {
    // Sparse arrays should not break
    /* eslint-disable no-sparse-arrays */
    assertSame(shallow([,], ["oops", 1]), false);
    assertSame(shallow(["oops", 1], [,]), false);
    assertSame(shallow([, , ,], [, , ,]), true);
    assertSame(shallow([, , , "hi"], [, , , "hi"]), true);
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
          assertSame(shallow(scalar1, scalar2), true);

          // If two values are shallowly equal, then those values wrapped in an
          // array (one level) should _also_ be considered shallowly equal
          assertSame(shallow([scalar1], [scalar2]), true);
          assertSame(shallow([scalar1, scalar1], [scalar2, scalar2]), true);

          // ...but wrapping twice is _never_ going to be equal
          assertSame(shallow([[scalar1]], [[scalar2]]), false);

          // Ditto for objects
          assertSame(shallow({ a: scalar1 }, { a: scalar2 }), true);
          assertSame(
            shallow({ a: scalar1, b: scalar1 }, { a: scalar2, b: scalar2 }),
            true
          );

          // ...but nesting twice is _never_ going to be equal
          assertSame(
            shallow({ a: { b: scalar1 } }, { a: { b: scalar2 } }),
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
          assertSame(shallow(scalar1, scalar2), false);

          // If two values are shallowly unequal, then wrapping those in an
          // array (one level) should also always be shallowly unequal
          assertSame(shallow([scalar1], [scalar2]), false);

          // Ditto for objects
          assertSame(shallow({ k: scalar1 }, { k: scalar2 }), false);
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
            assertSame(shallow([complex1], [complex2]), false);
          }

          // Ditto for objects
          if (shallow(complex1, complex2)) {
            assertSame(shallow({ k: complex1 }, { k: complex2 }), false);
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
            assertSame(shallow(value1, value2), true);
          }

          if (shallow({ k: value1 }, { k: value2 })) {
            assertSame(shallow(value1, value2), true);
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
          assertSame(shallow(value1, value2), shallow(value2, value1));
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
          assertSame(shallow(v1, v2), false);
          assertSame(shallow([v1], [v2]), false);
          assertSame(shallow({ k: v1 }, { k: v2 }), false);
        }
      )
    );
  });
});
