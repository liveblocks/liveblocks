import * as fc from "fast-check";
import { expect, test } from "vitest";

import { liveStructure } from "../arbitraries.js";

test("[prop] toImmutable will always cached", () =>
  fc.assert(
    fc.property(
      liveStructure,

      (liveThing) => {
        const imm1 = liveThing.toImmutable();
        const imm2 = liveThing.toImmutable();
        expect(imm1).toBe(imm2);
      }
    )
  ));

test("[prop] toImmutable will be recomputed after explicit invalidation", () =>
  fc.assert(
    fc.property(
      liveStructure,

      (liveThing) => {
        const imm1 = liveThing.toImmutable();
        liveThing.invalidate();
        const imm2 = liveThing.toImmutable();
        expect(imm1).not.toBe(imm2);
      }
    )
  ));

// XXX Make pass!
test.skip("[prop] TODO: toImmutable will be recomputed after invalidation of any child values", () =>
  fc.assert(
    fc.property(
      liveStructure,

      (liveThing) => {
        const imm1 = liveThing.toImmutable();
        // XXX Implement me by calling .invalidate() on any nested Live (grand)child under liveThing
        // XXX liveThing.invalidateSomeChild();
        const imm2 = liveThing.toImmutable();
        expect(imm1).not.toBe(imm2);
      }
    )
  ));
