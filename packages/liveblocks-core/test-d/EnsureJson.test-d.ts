import type { EnsureJson, Json, JsonObject } from "@liveblocks/core";
import { expectAssignable, expectType } from "tsd";

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

expectType<Json | undefined>(u);
expectType<string[]>(ua1);
expectType<(number | string)[]>(ua2);
expectType<(number | string | boolean | null)[]>(ua3);
expectType<Valid[]>(ua4);
expectType<Valid[]>(ua5);

expectType<{ hi?: Json; date?: number | string }>(uo);
expectAssignable<JsonObject>(uo);

expectType<{
  createdAt?: string | number; // Date became a string
  err: { name: string; message: string; stack?: string; cause?: Json };
  items: Item[];
}>(u6);
