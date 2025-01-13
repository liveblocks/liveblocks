import type { Relax } from "@liveblocks/core";
import { expectType } from "tsd";

{
  type Actual = Relax<{ foo: string | number }>;
  type Expected = { foo: string | number };

  let ru!: Actual;
  expectType<Expected>(ru);
}

{
  type Actual = Relax<{ foo: string } | { foo: number }>;
  type Expected = { foo: string } | { foo: number };

  let ru!: Actual;
  expectType<Expected>(ru);
}

{
  type Actual = Relax<{ foo: string } | { bar: number }>;
  type Expected = { foo: string; bar?: never } | { bar: number; foo?: never };

  let ru!: Actual;
  expectType<Expected>(ru);
}

{
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
  expectType<Expected>(ru);
}

{
  type Actual = Relax<
    | { type: "thing1"; payload: string }
    | { type: "thing2"; payload: boolean }
    | { type: "thing3"; payload: number }
    | { type: "thing4" }
  >;

  let ru!: Actual;
  expectType<string | number | boolean | undefined>(ru.payload);
  if (ru.type === "thing3") {
    expectType<number>(ru.payload);
  }
  if (ru.payload === "string") {
    expectType<"thing1">(ru.type);
  }
}

{
  type Actual = Relax<{ a: string } | {}>;
  type Expected = { a: string } | { a?: never };

  let ru!: Actual;
  expectType<Expected>(ru);
}
