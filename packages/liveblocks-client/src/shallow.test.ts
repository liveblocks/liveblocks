import fc from "fast-check";

import shallow from "./shallow";

const scalar = () => fc.jsonValue({ maxDepth: 0 });

const complex = () =>
  fc
    .anything({
      withBigInt: true,
      withBoxedValues: true,
      withDate: true,
      withMap: true,
      withNullPrototype: true,
      withObjectString: true,
      withSet: true,
      withTypedArray: true,
      withSparseArray: true,
    })
    .filter((value) => value !== null && typeof value === "object");

describe("shallow", () => {
  it("scalar values", () => {
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

  it("scalar values wrapped in list", () => {
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

  it("scalar values wrapped in objs", () => {
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
});

describe("shallow (properties)", () => {
  it("all equal scalars are shallowly equal", () => {
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

  it("different scalars are not shallowly equal", () => {
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

  it("equal composite values", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.clone(complex(), 2),

        // Unit test
        ([complex1, complex2]) => {
          // Property: _if_ two complex values are considered shallowly equal,
          // then wrapping them in an array (one level) will guarantee they're
          // not shallowly equal
          expect(
            // Read as: if complex1 = complex2, then also [complex1] != [complex2]
            !shallow(complex1, complex2) || !shallow([complex1], [complex2])
          ).toBe(true);

          // Ditto for objects
          expect(
            // Read as: if complex1 = complex2, then also [complex1] != [complex2]
            !shallow(complex1, complex2) ||
              !shallow({ k: complex1 }, { k: complex2 })
          ).toBe(true);
        }
      )
    );
  });

  it("dates are always considered unequal", () => {
    fc.assert(
      fc.property(
        // Inputs
        fc.date(),
        fc.date(),

        // Unit test
        (date1, date2) => {
          expect(shallow(date1, date2)).toBe(false);
          expect(shallow([date1], [date2])).toBe(false);
          expect(shallow({ k: date1 }, { k: date2 })).toBe(false);
        }
      )
    );
  });
});
