import fc from "fast-check";

import { DerivedRef, ValueRef } from "../ValueRef";

describe("Value ref cache", () => {
  it("empty", () => {
    const ref = new ValueRef({});
    expect(ref.current).toStrictEqual({});
  });

  it("setting works with any value", () => {
    fc.assert(
      fc.property(
        fc.anything(),
        fc.anything(),

        (init, newVal) => {
          const ref = new ValueRef<unknown>(init);
          expect(ref.current).toStrictEqual(init);

          ref.set(newVal);
          expect(ref.current).toStrictEqual(newVal);
        }
      )
    );
  });

  it("will freeze all given values", () => {
    fc.assert(
      fc.property(
        fc.anything(),
        fc.anything(),

        (init, newVal) => {
          // Freezes in constructor
          const ref = new ValueRef<unknown>(init);
          expect(ref.current).toStrictEqual(init);
          expect(() => {
            (ref.current as any).abc = 123;
          }).toThrow();

          // Freezes in setter
          ref.set(newVal);
          expect(ref.current).toStrictEqual(newVal);
          expect(() => {
            (ref.current as any).xyz = 456;
          }).toThrow();
        }
      )
    );
  });
});

describe("Derived ref cache", () => {
  it("Cache a derived value from other ref caches", () => {
    const greeting = new ValueRef("hi");
    const count = new ValueRef({ times: 3 });
    const ref = new DerivedRef([greeting, count], (x, y) => x.repeat(y.times));

    expect(ref.current).toStrictEqual("hihihi");

    count.set({ times: 5 });
    expect(ref.current).toStrictEqual("hihihihihi");

    greeting.set("👋");
    expect(ref.current).toStrictEqual("👋👋👋👋👋");
  });
});
