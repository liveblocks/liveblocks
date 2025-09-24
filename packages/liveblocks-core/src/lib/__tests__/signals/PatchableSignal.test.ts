import { assertEq, assertSame } from "tosti";
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
    assertEq(ref.get(), { x: 0, y: 0 });
  });

  describe("tracking", () => {
    test("patching", () => {
      const ref = new PatchableSignal<P>({ x: 0, y: 0 });
      ref.patch({ y: 1, z: 2 });

      assertEq(ref.get(), { x: 0, y: 1, z: 2 });
    });

    test("patching me with undefineds deletes keys", () => {
      const ref = new PatchableSignal<P>({ x: 1, y: 2 });

      ref.patch({ x: undefined });
      assertEq(ref.get(), { y: 2 });

      ref.patch({ y: undefined });
      assertEq(ref.get(), {});

      ref.patch({ z: undefined });
      assertEq(ref.get(), {});
    });
  });

  describe("caching", () => {
    test("caches immutable results", () => {
      const ref = new PatchableSignal<P>({ x: 0, y: 0 });

      const me1 = ref.get();
      const me2 = ref.get();
      assertSame(me1, me2);

      // These are effectively no-ops
      ref.patch({ x: 0 });
      ref.patch({ y: 0, z: undefined });

      const me3 = ref.get();
      assertSame(me2, me3); // No observable change!

      ref.patch({ y: -1 });

      const me4 = ref.get();
      const me5 = ref.get();
      // XXX Add support for `not()` in tosti?
      expect(me3).not.toBe(me4); // Me changed...
      assertSame(me4, me5);

      const me6 = ref.get();
      const me7 = ref.get();
      assertSame(me5, me6); // Me did not change
      assertSame(me6, me7);
    });
  });
});
