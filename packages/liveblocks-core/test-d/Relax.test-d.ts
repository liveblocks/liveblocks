import type { Relax } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

describe("Relax", () => {
  test("should be a no-op on a single-member union", () => {
    type Actual = Relax<{ foo: string | number }>;
    type Expected = { foo: string | number };
    let ru!: Actual;
    expectTypeOf(ru).toEqualTypeOf<Expected>();
  });

  test("should be a no-op when all union members share the same keys", () => {
    type Actual = Relax<{ foo: string } | { foo: number }>;
    type Expected = { foo: string } | { foo: number };
    let ru!: Actual;
    expectTypeOf(ru).toEqualTypeOf<Expected>();
  });

  test("should add optional never for absent keys in disjoint unions", () => {
    type Actual = Relax<{ foo: string } | { bar: number }>;
    type Expected = { foo: string; bar?: never } | { bar: number; foo?: never };
    let ru!: Actual;
    expectTypeOf(ru).toEqualTypeOf<Expected>();
  });

  test("should add optional never for each absent key in unions", () => {
    type Actual = Relax<
      | { a: "hey"; b: string }
      | { c: number; d: boolean }
      | { e: Error; f: Date }
      | { a: "hi"; d: boolean }
    >;
    type Expected =
      | { a: "hey"; b: string; c?: never; d?: never; e?: never; f?: never }
      | { c: number; d: boolean; a?: never; b?: never; e?: never; f?: never }
      | { e: Error; f: Date; a?: never; b?: never; c?: never; d?: never }
      | { a: "hi"; d: boolean; b?: never; c?: never; e?: never; f?: never };
    let ru!: Actual;
    expectTypeOf(ru).toEqualTypeOf<Expected>();
  });

  test("should narrow down discriminated unions", () => {
    type Actual = Relax<
      | { type: "thing1"; payload: string }
      | { type: "thing2"; payload: boolean }
      | { type: "thing3"; payload: number }
      | { type: "thing4" }
    >;
    let ru!: Actual;
    expectTypeOf(ru.payload).toEqualTypeOf<
      string | number | boolean | undefined
    >();
    if (ru.type === "thing3") {
      expectTypeOf(ru.payload).toEqualTypeOf<number>();
    }
    if (ru.payload === "string") {
      expectTypeOf(ru.type).toEqualTypeOf<"thing1">();
    }
  });

  test("should add optional never when a union member is empty", () => {
    type Actual = Relax<{ a: string } | {}>;
    type Expected = { a: string } | { a?: never };
    let ru!: Actual;
    expectTypeOf(ru).toEqualTypeOf<Expected>();
  });
});
