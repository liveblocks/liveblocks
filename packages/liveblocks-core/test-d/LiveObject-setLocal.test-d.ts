import { LiveList, LiveMap, LiveObject } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

type Schema = {
  required: string;
  optionalJson?: number;
  optionalString?: string;
  optionalArray?: number[];
  optionalObject?: { nested: string; count: number };
  optionalLiveObject?: LiveObject<{ x: number }>;
  optionalLiveList?: LiveList<number>;
  optionalLiveMap?: LiveMap<string, string>;
  optionalJsonOrUndefined: string | undefined;
};

declare const obj: LiveObject<Schema>;

type IndexedSchema = {
  [key: string]: string | number | undefined;
  required: string;
  localOnly?: string;
};

declare const indexed: LiveObject<IndexedSchema>;

describe("LiveObject.setLocal", () => {
  test("should accept optional JSON keys", () => {
    obj.setLocal("optionalJson", 42);
    obj.setLocal("optionalString", "hello");
    obj.setLocal("optionalJsonOrUndefined", "hello");
    obj.setLocal("optionalArray", [1, 2, 3]);
    obj.setLocal("optionalObject", { nested: "hi", count: 5 });
  });

  test("should reject required keys", () => {
    // @ts-expect-error - Only optional keys can be set as local values
    obj.setLocal("required", "value");
  });

  test("should reject Live structures", () => {
    // @ts-expect-error - Only plain JSON values can be set as local values
    obj.setLocal("optionalLiveObject", new LiveObject({ x: 1 }));

    // @ts-expect-error - Only plain JSON values can be set as local values
    obj.setLocal("optionalLiveList", new LiveList([1]));

    // @ts-expect-error - Only plain JSON values can be set as local values
    obj.setLocal("optionalLiveMap", new LiveMap([["a", "b"]]));
  });

  test("should reject wrong value types and nonexistent keys", () => {
    // @ts-expect-error - `"optionalJson"` expects `number`, not `string`
    obj.setLocal("optionalJson", "not a number");

    // @ts-expect-error - `undefined` is not allowed
    obj.setLocal("optionalJson", undefined);

    // @ts-expect-error - `"nonexistent"` is not a key in the schema
    obj.setLocal("nonexistent", 42);
  });

  test("should only allow explicitly-optional named keys on indexed schemas", () => {
    indexed.setLocal("localOnly", "hello");

    // @ts-expect-error - `"required"` is not optional even though the index signature allows `string` values
    indexed.setLocal("required", "hello");

    // @ts-expect-error - Unknown keys are rejected even when the index signature would otherwise allow them, only explicitly-optional named keys are accepted
    indexed.setLocal("nonexistent", "hello");
  });

  test("should include local values in get() return type", () => {
    expectTypeOf(obj.get("optionalJson")).toEqualTypeOf<number | undefined>();
    expectTypeOf(obj.get("required")).toEqualTypeOf<string>();
  });
});
