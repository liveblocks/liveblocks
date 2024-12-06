import * as fc from "fast-check";
import { expect, test } from "vitest";

import { LiveObject } from "~/LiveObject.js";

import { jsonObject, liveObject } from "../arbitraries.js";

test("new LiveObject without a value", () => {
  expect(
    () =>
      // @ts-expect-error Deliberate invalid constructor call
      new LiveObject()
  ).toThrow("Missing initial value");
});

test("new LiveObject with empty record", () => {
  const obj = new LiveObject({});
  expect(obj.toImmutable()).toEqual({});
});

test("get with local data", () => {
  const obj = new LiveObject({ a: 1 });
  expect(obj.get("a")).toEqual(1);
});

test("toImmutable with nested LiveObjects", () => {
  const input = {
    a: 42,
    b: [1, false, { [0]: "hi" }],
    c: new LiveObject({ x: 1, y: new LiveObject({ z: 2 }) }),
  };
  const expected = {
    a: 42,
    b: [1, false, { [0]: "hi" }],
    c: { x: 1, y: { z: 2 } },
  };
  const obj = new LiveObject(input);
  expect(obj.toImmutable()).toEqual(expected);
});

test("[prop] toImmutable is trivial with JSON-only LiveObjects", () =>
  fc.assert(
    fc.property(
      jsonObject,

      (obj) => {
        const liveObj = new LiveObject(obj);
        expect(liveObj.toImmutable()).toEqual(obj);
      }
    )
  ));

test("[prop] toImmutable will be invalidated after every .set()", () =>
  fc.assert(
    fc.property(
      liveObject,

      (liveObj) => {
        const imm = liveObj.toImmutable();
        liveObj.set("a", 1);
        const imm2 = liveObj.toImmutable();
        expect(imm).not.toBe(imm2); // Should never be the same instance!
      }
    )
  ));

test("[prop] toImmutable will be invalidated after every .delete()", () =>
  fc.assert(
    fc.property(
      liveObject,

      (liveObj) => {
        const imm = liveObj.toImmutable();
        liveObj.delete("a");
        const imm2 = liveObj.toImmutable();
        expect(imm).not.toBe(imm2); // Should never be the same instance!
      }
    )
  ));
