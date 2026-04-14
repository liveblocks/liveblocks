import type {
  Lson,
  LsonObject,
  ReadonlyJsonObject,
  ToJson,
} from "@liveblocks/core";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

declare const str: string;
declare const num: number;
declare const bool: boolean;

declare function or<T, U>(a: T, b: U): T | U;
declare function maybe<T>(a: T): T | undefined;

declare function toJson<T extends Lson | LsonObject>(value: T): ToJson<T>;

describe("ToJson", () => {
  // ---------------------------------------------------------------------------
  // Json scalars
  // ---------------------------------------------------------------------------
  test("number passthrough", () => {
    expectTypeOf(toJson(num)).toEqualTypeOf<number>();
  });

  test("number literal", () => {
    expectTypeOf(toJson(42)).toEqualTypeOf<42>();
  });

  test("string passthrough", () => {
    expectTypeOf(toJson(str)).toEqualTypeOf<string>();
  });

  test("string literal", () => {
    expectTypeOf(toJson("hi")).toEqualTypeOf<"hi">();
  });

  test("boolean passthrough", () => {
    expectTypeOf(toJson(bool)).toEqualTypeOf<boolean>();
  });

  test("boolean literal", () => {
    expectTypeOf(toJson(true)).toEqualTypeOf<true>();
  });

  test("null passthrough", () => {
    expectTypeOf(toJson(null)).toEqualTypeOf<null>();
  });

  // ---------------------------------------------------------------------------
  // Unions of Json scalars
  // ---------------------------------------------------------------------------
  test("string | number", () => {
    expectTypeOf(toJson(or(str, num))).toEqualTypeOf<string | number>();
  });

  // ---------------------------------------------------------------------------
  // LiveList
  // ---------------------------------------------------------------------------
  test("LiveList<number>", () => {
    expectTypeOf(toJson(new LiveList([1, 2, 3]))).toEqualTypeOf<
      readonly number[]
    >();
  });

  test("LiveList<string>", () => {
    expectTypeOf(toJson(new LiveList(["a", "b"]))).toEqualTypeOf<
      readonly string[]
    >();
  });

  test("nested LiveList<LiveList<number>>", () => {
    expectTypeOf(toJson(new LiveList([new LiveList([1, 2])]))).toEqualTypeOf<
      readonly (readonly number[])[]
    >();
  });

  // ---------------------------------------------------------------------------
  // LiveObject
  // ---------------------------------------------------------------------------
  test("LiveObject with scalar fields", () => {
    expectTypeOf(toJson(new LiveObject({ a: 1, b: "" }))).toEqualTypeOf<{
      readonly a: number;
      readonly b: string;
    }>();
  });

  test("LiveObject with optional field", () => {
    expectTypeOf(
      toJson(new LiveObject({ a: 1, b: maybe(str) }))
    ).toEqualTypeOf<{
      readonly a: number;
      readonly b: string | undefined;
    }>();

  });

  test("LiveObject with mixed fields (docstring example)", () => {
    expectTypeOf(
      toJson(
        new LiveObject({
          a: 1,
          b: new LiveList(["x"]),
          c: maybe(num),
        })
      )
    ).toEqualTypeOf<{
      readonly a: number;
      readonly b: readonly string[];
      readonly c: number | undefined;
    }>();
  });

  test("nested LiveObject", () => {
    expectTypeOf(
      toJson(new LiveObject({ inner: new LiveObject({ x: 42 }) }))
    ).toEqualTypeOf<{
      readonly inner: { readonly x: number };
    }>();
    expectTypeOf(
      toJson(new LiveObject({ inner: new LiveObject({ x: 42 as const }) }))
    ).toEqualTypeOf<{
      readonly inner: { readonly x: 42 };
    }>();
    expectTypeOf(
      toJson(new LiveObject({ inner: new LiveObject({ x: 42 as 42 | "foo" }) }))
    ).toEqualTypeOf<{
      readonly inner: { readonly x: "foo" | 42 };
    }>();
  });

  test("fully opaque LiveObject short-circuits to ReadonlyJsonObject", () => {
    expectTypeOf(
      toJson(new LiveObject<LsonObject>({}))
    ).toEqualTypeOf<ReadonlyJsonObject>();
  });

  // ---------------------------------------------------------------------------
  // LiveMap
  // ---------------------------------------------------------------------------
  test("LiveMap<string, number>", () => {
    expectTypeOf(toJson(new LiveMap<string, number>())).toEqualTypeOf<{
      readonly [key: string]: number;
    }>();
  });

  test("LiveMap<string, LiveList<number>>", () => {
    expectTypeOf(
      toJson(new LiveMap<string, LiveList<number>>())
    ).toEqualTypeOf<{
      readonly [key: string]: readonly number[];
    }>();
  });

  // ---------------------------------------------------------------------------
  // Unions involving Live types
  // ---------------------------------------------------------------------------
  test("string | LiveList<number>", () => {
    const value0 = or(str, new LiveList([]));
    expectTypeOf(toJson(value0)).toEqualTypeOf<string | readonly never[]>();

    const value1 = or(str, new LiveList([num]));
    expectTypeOf(toJson(value1)).toEqualTypeOf<string | readonly number[]>();

    const value2 = or(str, new LiveList([1, 2, 3]));
    expectTypeOf(toJson(value2)).toEqualTypeOf<
      string | readonly (1 | 2 | 3)[]
    >();

    const value3 = or(str, new LiveList([1, 2, 3] as const));
    expectTypeOf(toJson(value3)).toEqualTypeOf<
      string | readonly (1 | 2 | 3)[]
    >();
  });

  // ---------------------------------------------------------------------------
  // LsonObject (plain objects, not wrapped in LiveObject)
  // ---------------------------------------------------------------------------
  test("object with named keys", () => {
    expectTypeOf(toJson({ x: 1, y: "a" })).toEqualTypeOf<{
      readonly x: number;
      readonly y: string;
    }>();
  });

  // ---------------------------------------------------------------------------
  // Generic string-keyed objects (regression from #3348)
  // ---------------------------------------------------------------------------
  test("Record<string, specific type> through LiveObject", () => {
    const liveObj = new LiveObject({} as Record<string, { prop: string }>);
    expectTypeOf(liveObj).toEqualTypeOf<
      LiveObject<Record<string, { prop: string }>>
    >();

    expectTypeOf(toJson(liveObj)).toEqualTypeOf<{
      readonly [key: string]: { readonly prop: string };
    }>();
  });

  test("Record<string, any> through LiveObject", () => {
    const liveObj = new LiveObject({} as Record<string, any>);
    // `any` takes both branches of the conditional, but the result is
    // effectively `{ readonly [key: string]: any }`. Using toExtend
    // because toEqualTypeOf doesn't handle `any` well.
    expectTypeOf(toJson(liveObj)).toExtend<{
      readonly [key: string]: any;
    }>();
  });

  test("Record<string, never> through LiveObject", () => {
    const liveObj = new LiveObject({} as Record<string, never>);
    expectTypeOf(toJson(liveObj)).toEqualTypeOf<{
      readonly [key: string]: never;
    }>();
  });

  test("Record<string, unknown> through LiveObject", () => {
    const liveObj = new LiveObject({} as Record<string, unknown> & LsonObject);
    expectTypeOf(toJson(liveObj)).toEqualTypeOf<ReadonlyJsonObject>();
  });

  test("Record<string, LiveObject<specific type>>", () => {
    const liveObj = new LiveObject(
      {} as Record<string, LiveObject<{ prop: string }>>
    );
    expectTypeOf(liveObj).toEqualTypeOf<
      LiveObject<Record<string, LiveObject<{ prop: string }>>>
    >();

    expectTypeOf(toJson(liveObj)).toEqualTypeOf<{
      readonly [key: string]: { readonly prop: string };
    }>();
  });

  test("Record<string, specific type> through LiveList<LiveObject>", () => {
    const liveObj = new LiveObject({} as Record<string, { prop: string }>);
    const liveList = new LiveList([liveObj]);
    expectTypeOf(liveList).toEqualTypeOf<
      LiveList<LiveObject<Record<string, { prop: string }>>>
    >();

    expectTypeOf(toJson(liveList)).toEqualTypeOf<
      readonly { readonly [key: string]: { readonly prop: string } }[]
    >();
  });
});
