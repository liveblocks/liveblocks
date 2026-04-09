import type { EnsureJson, Json, JsonObject } from "@liveblocks/core";
import { describe, expectTypeOf, test } from "vitest";

type Item = {
  n?: number;
  s: string;
  b: boolean;
  nu: null;
  sn: string | number;
  sno?: string | number;
  xs: number[];
};

interface IItem {
  n?: number;
  s: string;
  b: boolean;
  nu: null;
  sn: string | number;
  sno?: string | number;
  xs: number[];
}

type Valid = {
  items: Item[];
};

interface IValid {
  items: IItem[];
}

interface IInvalid {
  createdAt?: Date | number;
  err: Error;
  items: IItem[];
}

declare const u: EnsureJson<unknown>;
declare const u6: EnsureJson<IInvalid>;

declare const ua1: EnsureJson<string[]>;
declare const ua2: EnsureJson<(number | string)[]>;
declare const ua3: EnsureJson<(number | string | boolean | null)[]>;
declare const ua4: EnsureJson<Valid[]>;
declare const ua5: EnsureJson<IValid[]>;

declare const uo: EnsureJson<{
  hi?: unknown;
  date?: number | string;
  toString(): string;
}>;

describe("EnsureJson", () => {
  test("should limit unknown types to JSON", () => {
    expectTypeOf(u).toEqualTypeOf<Json | undefined>();
  });

  test("should keep JSON-compatible types", () => {
    expectTypeOf(ua1).toEqualTypeOf<string[]>();
    expectTypeOf(ua2).toEqualTypeOf<(number | string)[]>();
    expectTypeOf(ua3).toEqualTypeOf<(number | string | boolean | null)[]>();
    expectTypeOf(ua4).toEqualTypeOf<Valid[]>();
    expectTypeOf(ua5).toEqualTypeOf<Valid[]>();
  });

  test("should strip non-JSON members and method signatures", () => {
    expectTypeOf(uo).toEqualTypeOf<{ hi?: Json; date?: number | string }>();
    expectTypeOf(uo).toExtend<JsonObject>();
  });

  test("should convert non-JSON types to JSON", () => {
    expectTypeOf(u6).toEqualTypeOf<{
      createdAt?: string | number; // Date became a string
      err: { name: string; message: string; stack?: string; cause?: Json }; // Error became a plain object
      items: Item[];
    }>();
  });
});
