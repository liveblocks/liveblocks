import { stringify, unstringify } from "../stringify";

describe("stringify", () => {
  it("returns the same result as JSON.stringify", () => {
    expect(
      stringify({
        a: 2,
      })
    ).toEqual(
      JSON.stringify({
        a: 2,
      })
    );
    expect(stringify([1, 2, 3])).toEqual(JSON.stringify([1, 2, 3]));
    expect(stringify("string")).toEqual(JSON.stringify("string"));
    expect(stringify(2)).toEqual(JSON.stringify(2));
    expect(stringify(true)).toEqual(JSON.stringify(true));
    expect(stringify(null)).toEqual(JSON.stringify(null));
  });

  it("supports objects in a stable way", () => {
    expect(
      stringify({
        a: 2,
        b: true,
      })
    ).toEqual(
      stringify({
        b: true,
        a: 2,
      })
    );
  });

  it("supports nested objects", () => {
    expect(stringify([{ a: 2, b: true }])).toEqual(
      stringify([{ b: true, a: 2 }])
    );
    expect(stringify([{ a: 2, b: true, c: [[{ e: -0, d: 0 }]] }])).toEqual(
      stringify([{ b: true, a: 2, c: [[{ d: 0, e: 0 }]] }])
    );
  });

  it("maintains explicitly-undefined keys", () => {
    expect(stringify(undefined)).toEqual(JSON.stringify("_explicit_undefined"));
    expect(stringify([{ b: true, c: undefined, a: 2 }])).toEqual(
      '[{"a":2,"b":true,"c":"_explicit_undefined"}]'
    );
    expect(stringify([{ a: 2, b: true }])).not.toEqual(
      stringify([{ b: true, c: undefined, a: 2 }])
    );
  });

  it("parse back explicit-undefined keys correctly", () => {
    expect(unstringify(stringify(undefined))).toEqual(undefined);
    expect(
      unstringify(stringify([{ b: true, c: undefined, a: 2 }, 3]))
    ).toEqual([{ b: true, a: 2 }, 3]);

    // @ts-expect-error this is fine
    const [parsed] = unstringify(stringify([{ a: 1, b: undefined }]));
    expect(parsed).toEqual({ a: 1 });
    expect(parsed.b).toEqual(undefined);
    expect("b" in parsed).toEqual(true); // Retain explicit-undefined!
    expect("non-existing" in parsed).toEqual(false);
  });
});
