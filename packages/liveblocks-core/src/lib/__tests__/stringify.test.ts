import { stringify } from "../stringify";

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
    expect(stringify(undefined)).toEqual(JSON.stringify(undefined));
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
});
