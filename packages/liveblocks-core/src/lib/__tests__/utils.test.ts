import * as fc from "fast-check";
import { assertEq, assertSame, assertThrows } from "tosti";
import { describe, expect, test } from "vitest";

import { isPlainObject } from "../guards";
import {
  b64decode,
  compact,
  compactObject,
  entries,
  keys,
  mapValues,
  remove,
  tryParseJson,
  values,
} from "../utils";

/**
 * This Arbitrary generator ensures that the generated object won't include
 * a __proto__ key, which makes expressing the tests easier. Tests to cover the
 * __proto__ cases are written separately.
 */
const objectWithoutProto = () =>
  fc.object().map((o) => {
    delete o["__proto__"];
    return o;
  });

describe("TypeScript wrapper utils", () => {
  test("keys (alias of Object.keys)", () => {
    assertEq(keys({}), []);
    assertEq(keys({ a: 1 }), ["a"]);
    assertEq(keys({ [1]: 1, [2]: 2 }), ["1", "2"]);
  });

  test("values (alias of Object.values)", () => {
    assertEq(values({}), []);
    assertEq(values({ a: 1 }), [1]);
    assertEq(values({ [1]: 1, [2]: 2 }), [1, 2]);
  });

  test("entries (alias of Object.entries)", () => {
    assertEq(entries({}), []);
    assertEq(entries({ a: 1 }), [["a", 1]]);
    assertEq(entries({ [1]: 1, [2]: 2 }), [
      ["1", 1],
      ["2", 2],
    ]);
  });
});

describe("compact", () => {
  test("compact w/ empty list", () => {
    assertEq(compact([]), []);
  });

  test("compact removes nulls and undefined values", () => {
    assertEq(compact(["a", "b", "c"]), ["a", "b", "c"]);
    assertEq(compact(["x", undefined]), ["x"]);
    assertEq(compact([0, null, undefined, NaN, Infinity]), [0, NaN, Infinity]);
  });
});

describe("compactObject", () => {
  test("compactObject w/ empty object", () => {
    assertEq(compactObject({}), {});
    assertEq(
      compactObject({
        a: 1,
        b: undefined,
        c: "hi",
        d: null,
        e: "",
        f: 0,
        g: false,
      }),
      {
        a: 1,
        // b: undefined  👈 Not present in the result!
        c: "hi",
        d: null,
        e: "",
        f: 0,
        g: false,
      }
    );
    assertEq(compactObject({ a: undefined, b: undefined, c: undefined }), {});
  });
});

describe("mapValues", () => {
  test("empty object", () => {
    assertEq(
      mapValues({}, (x) => x),
      {}
    );
  });

  test("maps values, not keys", () => {
    assertEq(
      mapValues({ a: 13, b: 0, c: -7 }, (n) => n * 2),
      {
        a: 26,
        b: 0,
        c: -14,
      }
    );
  });

  test("keys don't change", () => {
    fc.assert(
      fc.property(
        objectWithoutProto(),

        (obj) => {
          const result = mapValues(obj, () => Math.random());
          assertEq(Object.keys(result), Object.keys(obj));
        }
      )
    );
  });

  test("will skip copying dangerous keys", () => {
    assertEq(
      mapValues({ __proto__: null }, (x) => x),
      {}
    );
    assertEq(
      mapValues({ ["__proto__"]: null }, (x) => x),
      {}
    );
    assertEq(
      mapValues({ __proto__: {} }, (x) => x),
      {}
    );
    assertEq(
      mapValues({ ["__proto__"]: {} }, (x) => x),
      {}
    );
    assertEq(
      mapValues({ __proto__: {}, b: 42 }, (x) => x),
      {
        b: 42,
      }
    );
    assertEq(
      mapValues({ ["__proto__"]: {}, b: 42 }, (x) => x),
      {
        b: 42,
      }
    );
  });

  test("using keys in mapper", () => {
    assertEq(
      mapValues({ a: 5, b: 0, c: 3 }, (n, k) => k.repeat(n)),
      { a: "aaaaa", b: "", c: "ccc" }
    );

    fc.assert(
      fc.property(
        objectWithoutProto(),

        (input) => {
          const output1 = mapValues(input, (x) => x);
          assertEq(output1, input);

          const output2 = mapValues(input, (_, k) => k);
          assertEq(Object.keys(output2), Object.keys(input));
          assertEq(Object.values(output2), Object.keys(input));
        }
      )
    );
  });
});

describe("isPlainObject", () => {
  test("isPlainObject", () => {
    assertSame(isPlainObject(undefined), false);
    assertSame(isPlainObject(null), false);
    assertSame(isPlainObject(false), false);
    assertSame(isPlainObject(0), false);
    assertSame(isPlainObject(1), false);
    assertSame(isPlainObject(""), false);
    assertSame(isPlainObject("hi"), false);
    assertSame(isPlainObject([]), false);
    assertSame(isPlainObject(["hi"]), false);
    assertSame(isPlainObject(new Date()), false);
    assertSame(isPlainObject(new Error("hi")), false);
    assertSame(
      isPlainObject(() => "a function"),
      false
    );

    assertSame(isPlainObject({}), true);
    assertSame(isPlainObject({ a: 1 }), true);

    assertSame(isPlainObject(Object.create(null)), true);
    assertSame(isPlainObject(new Object()), true);
  });
});

describe("tryParseJson", () => {
  test("works like JSON.parse() on legal JSON inputs", () => {
    assertEq(tryParseJson("true"), true);
    assertEq(tryParseJson("false"), false);
    assertEq(tryParseJson("null"), null);
    assertEq(tryParseJson('"hi"'), "hi");
    assertEq(tryParseJson('["hi", {"a": 1}]'), ["hi", { a: 1 }]);
  });

  test("returns undefined for invalid JSON inputs", () => {
    assertEq(tryParseJson("i am not a JSON value"), undefined);
    assertEq(tryParseJson("'single quotes'"), undefined);
    assertEq(tryParseJson("[[]"), undefined);
  });
});

describe("b64decode", () => {
  test("payload contains characters with accents", () => {
    const tokenPayload =
      "eyJyb29tSWQiOiJNaDNtTGQ1OUxWSjdLQTJlVWIwTWUiLCJhcHBJZCI6IjYxNDBlMzMyMjliY2ExNWQxNDYxMzBhOSIsImFjdG9yIjo5LCJzY29wZXMiOlsicm9vbTpyZWFkIiwicm9vbTp3cml0ZSIsIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIl0sImluZm8iOnsibmFtZSI6IkNoYXJsacOpIExheW5lIiwicGljdHVyZSI6Ii9hdmF0YXJzLzcucG5nIn0sImlhdCI6MTY1MzUxNjA4NiwiZXhwIjoxNjUzNTE5Njg2fQ";
    const json = tryParseJson(b64decode(tokenPayload));

    assertEq(json, {
      actor: 9,
      appId: "6140e33229bca15d146130a9",
      exp: 1653519686,
      iat: 1653516086,
      info: {
        name: "Charlié Layne",
        picture: "/avatars/7.png",
      },
      roomId: "Mh3mLd59LVJ7KA2eUb0Me",
      scopes: [
        "room:read",
        "room:write",
        "websocket:presence",
        "websocket:storage",
      ],
    });
  });

  test("payload contains characters with accents", () => {
    assertThrows(
      () => b64decode("i contain `invalid` chars"),
      "Invalid character"
    );
    assertThrows(() => b64decode("---"), "Invalid character");
  });
});

describe("remove", () => {
  test("empty", () => {
    const arr: string[] = [];
    remove(arr, "something");
    assertEq(arr, []);
  });

  test("removes only the first occurrence", () => {
    const arr: number[] = [1, 2, 3, 1, 2, 3];
    remove(arr, 2);
    assertEq(arr, [1, 3, 1, 2, 3]);
  });
});
