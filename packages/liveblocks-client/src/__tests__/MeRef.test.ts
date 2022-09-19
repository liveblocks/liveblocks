import { MeRef } from "../MeRef";

type P = {
  x: number;
  y: number;
  z?: number;
};

describe('Read-only "me" ref cache', () => {
  it("empty", () => {
    const me = new MeRef({ x: 0, y: 0, z: undefined });
    expect(me.current).toStrictEqual({ x: 0, y: 0 });
  });

  describe('Tracking "me"', () => {
    it("patching me", () => {
      const me = new MeRef<P>({ x: 0, y: 0 });
      me.patch({ y: 1, z: 2 });

      expect(me.current).toStrictEqual({ x: 0, y: 1, z: 2 });
    });

    it("patching me with undefineds deletes keys", () => {
      const me = new MeRef<P>({ x: 1, y: 2 });

      me.patch({ x: undefined });
      expect(me.current).toStrictEqual({ y: 2 });

      me.patch({ y: undefined });
      expect(me.current).toStrictEqual({});

      me.patch({ z: undefined });
      expect(me.current).toStrictEqual({});
    });
  });

  describe("caching", () => {
    it("caches immutable results (me)", () => {
      const me = new MeRef<P>({ x: 0, y: 0 });

      const me1 = me.current;
      const me2 = me.current;
      expect(me1).toBe(me2);

      // These are effectively no-ops
      me.patch({ x: 0 });
      me.patch({ y: 0, z: undefined });

      const me3 = me.current;
      expect(me2).toBe(me3); // No observable change!

      me.patch({ y: -1 });

      const me4 = me.current;
      const me5 = me.current;
      expect(me3).not.toBe(me4); // Me changed...
      expect(me4).toBe(me5);

      const me6 = me.current;
      const me7 = me.current;
      expect(me5).toBe(me6); // Me did not change
      expect(me6).toBe(me7);
    });
  });
});
