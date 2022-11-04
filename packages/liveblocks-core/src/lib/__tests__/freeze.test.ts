import { freeze } from "../freeze";

describe("freeze", () => {
  it("freezes objects", () => {
    const x = freeze({ a: 1 }) as Record<string, unknown>;
    expect(() => {
      x.b = 2;
    }).toThrow();
    expect(x.a).toEqual(1);
    expect(x.b).toBeUndefined();
  });
});
