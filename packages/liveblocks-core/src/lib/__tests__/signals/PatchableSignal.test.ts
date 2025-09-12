import { describe, expect, test } from "vitest";

import { PatchableSignal } from "../../signals";

type P = {
  x: number;
  y: number;
  z?: number;
};

describe('Read-only "patchable" ref cache', () => {
  test("empty", () => {
    const ref = new PatchableSignal({ x: 0, y: 0, z: undefined });
    expect(ref.get()).toStrictEqual({ x: 0, y: 0 });
  });

  describe("tracking", () => {
    test("patching", () => {
      const ref = new PatchableSignal<P>({ x: 0, y: 0 });
      ref.patch({ y: 1, z: 2 });

      expect(ref.get()).toStrictEqual({ x: 0, y: 1, z: 2 });
    });

    test("patching me with undefineds deletes keys", () => {
      const ref = new PatchableSignal<P>({ x: 1, y: 2 });

      ref.patch({ x: undefined });
      expect(ref.get()).toStrictEqual({ y: 2 });

      ref.patch({ y: undefined });
      expect(ref.get()).toStrictEqual({});

      ref.patch({ z: undefined });
      expect(ref.get()).toStrictEqual({});
    });
  });

  describe("caching", () => {
    test("caches immutable results", () => {
      const ref = new PatchableSignal<P>({ x: 0, y: 0 });

      const me1 = ref.get();
      const me2 = ref.get();
      expect(me1).toBe(me2);

      // These are effectively no-ops
      ref.patch({ x: 0 });
      ref.patch({ y: 0, z: undefined });

      const me3 = ref.get();
      expect(me2).toBe(me3); // No observable change!

      ref.patch({ y: -1 });

      const me4 = ref.get();
      const me5 = ref.get();
      expect(me3).not.toBe(me4); // Me changed...
      expect(me4).toBe(me5);

      const me6 = ref.get();
      const me7 = ref.get();
      expect(me5).toBe(me6); // Me did not change
      expect(me6).toBe(me7);
    });
  });
});
