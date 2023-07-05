import { PatchableRef } from "../PatchableRef";

type P = {
  x: number;
  y: number;
  z?: number;
};

describe('Read-only "patchable" ref cache', () => {
  it("empty", () => {
    const ref = new PatchableRef({ x: 0, y: 0, z: undefined });
    expect(ref.current).toStrictEqual({ x: 0, y: 0 });
  });

  describe("tracking", () => {
    it("patching", () => {
      const ref = new PatchableRef<P>({ x: 0, y: 0 });
      ref.patch({ y: 1, z: 2 });

      expect(ref.current).toStrictEqual({ x: 0, y: 1, z: 2 });
    });

    it("patching me with undefineds deletes keys", () => {
      const ref = new PatchableRef<P>({ x: 1, y: 2 });

      ref.patch({ x: undefined });
      expect(ref.current).toStrictEqual({ y: 2 });

      ref.patch({ y: undefined });
      expect(ref.current).toStrictEqual({});

      ref.patch({ z: undefined });
      expect(ref.current).toStrictEqual({});
    });
  });

  describe("caching", () => {
    it("caches immutable results", () => {
      const ref = new PatchableRef<P>({ x: 0, y: 0 });

      const me1 = ref.current;
      const me2 = ref.current;
      expect(me1).toBe(me2);

      // These are effectively no-ops
      ref.patch({ x: 0 });
      ref.patch({ y: 0, z: undefined });

      const me3 = ref.current;
      expect(me2).toBe(me3); // No observable change!

      ref.patch({ y: -1 });

      const me4 = ref.current;
      const me5 = ref.current;
      expect(me3).not.toBe(me4); // Me changed...
      expect(me4).toBe(me5);

      const me6 = ref.current;
      const me7 = ref.current;
      expect(me5).toBe(me6); // Me did not change
      expect(me6).toBe(me7);
    });
  });
});
