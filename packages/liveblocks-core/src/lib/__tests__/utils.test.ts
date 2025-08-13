import * as fc from "fast-check";
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
    expect(keys({})).toEqual([]);
    expect(keys({ a: 1 })).toEqual(["a"]);
    expect(keys({ [1]: 1, [2]: 2 })).toEqual(["1", "2"]);
  });

  test("values (alias of Object.values)", () => {
    expect(values({})).toEqual([]);
    expect(values({ a: 1 })).toEqual([1]);
    expect(values({ [1]: 1, [2]: 2 })).toEqual([1, 2]);
  });

  test("entries (alias of Object.entries)", () => {
    expect(entries({})).toEqual([]);
    expect(entries({ a: 1 })).toEqual([["a", 1]]);
    expect(entries({ [1]: 1, [2]: 2 })).toEqual([
      ["1", 1],
      ["2", 2],
    ]);
  });
});

describe("compact", () => {
  test("compact w/ empty list", () => {
    expect(compact([])).toEqual([]);
  });

  test("compact removes nulls and undefined values", () => {
    expect(compact(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(compact(["x", undefined])).toEqual(["x"]);
    expect(compact([0, null, undefined, NaN, Infinity])).toEqual([
      0,
      NaN,
      Infinity,
    ]);
  });
});

describe("compactObject", () => {
  test("compactObject w/ empty object", () => {
    expect(compactObject({})).toStrictEqual({});
    expect(
      compactObject({
        a: 1,
        b: undefined,
        c: "hi",
        d: null,
        e: "",
        f: 0,
        g: false,
      })
    ).toStrictEqual({
      a: 1,
      // b: undefined  👈 Not present in the result!
      c: "hi",
      d: null,
      e: "",
      f: 0,
      g: false,
    });
    expect(
      compactObject({ a: undefined, b: undefined, c: undefined })
    ).toStrictEqual({});
  });
});

describe("mapValues", () => {
  test("empty object", () => {
    expect(mapValues({}, (x) => x)).toStrictEqual({});
  });

  test("maps values, not keys", () => {
    expect(mapValues({ a: 13, b: 0, c: -7 }, (n) => n * 2)).toStrictEqual({
      a: 26,
      b: 0,
      c: -14,
    });
  });

  test("keys don't change", () => {
    fc.assert(
      fc.property(
        objectWithoutProto(),

        (obj) => {
          const result = mapValues(obj, () => Math.random());
          expect(Object.keys(result)).toStrictEqual(Object.keys(obj));
        }
      )
    );
  });

  test("will skip copying dangerous keys", () => {
    expect(mapValues({ __proto__: null }, (x) => x)).toStrictEqual({});
    expect(mapValues({ ["__proto__"]: null }, (x) => x)).toStrictEqual({});
    expect(mapValues({ __proto__: {} }, (x) => x)).toStrictEqual({});
    expect(mapValues({ ["__proto__"]: {} }, (x) => x)).toStrictEqual({});
    expect(mapValues({ __proto__: {}, b: 42 }, (x) => x)).toStrictEqual({
      b: 42,
    });
    expect(mapValues({ ["__proto__"]: {}, b: 42 }, (x) => x)).toStrictEqual({
      b: 42,
    });
  });

  test("using keys in mapper", () => {
    expect(
      mapValues({ a: 5, b: 0, c: 3 }, (n, k) => k.repeat(n))
    ).toStrictEqual({ a: "aaaaa", b: "", c: "ccc" });

    fc.assert(
      fc.property(
        objectWithoutProto(),

        (input) => {
          const output1 = mapValues(input, (x) => x);
          expect(output1).toStrictEqual(input);

          const output2 = mapValues(input, (_, k) => k);
          expect(Object.keys(output2)).toStrictEqual(Object.keys(input));
          expect(Object.values(output2)).toStrictEqual(Object.keys(input));
        }
      )
    );
  });
});

describe("isPlainObject", () => {
  test("isPlainObject", () => {
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(false)).toBe(false);
    expect(isPlainObject(0)).toBe(false);
    expect(isPlainObject(1)).toBe(false);
    expect(isPlainObject("")).toBe(false);
    expect(isPlainObject("hi")).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(["hi"])).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(new Error("hi"))).toBe(false);
    expect(isPlainObject(() => "a function")).toBe(false);

    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);

    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(isPlainObject(new Object())).toBe(true);
  });
});

describe("tryParseJson", () => {
  test("works like JSON.parse() on legal JSON inputs", () => {
    expect(tryParseJson("true")).toEqual(true);
    expect(tryParseJson("false")).toEqual(false);
    expect(tryParseJson("null")).toEqual(null);
    expect(tryParseJson('"hi"')).toEqual("hi");
    expect(tryParseJson('["hi", {"a": 1}]')).toEqual(["hi", { a: 1 }]);
  });

  test("returns undefined for invalid JSON inputs", () => {
    expect(tryParseJson("i am not a JSON value")).toBeUndefined();
    expect(tryParseJson("'single quotes'")).toBeUndefined();
    expect(tryParseJson("[[]")).toBeUndefined();
  });
});

describe("b64decode", () => {
  test("payload contains characters with accents", () => {
    const tokenPayload =
      "eyJyb29tSWQiOiJNaDNtTGQ1OUxWSjdLQTJlVWIwTWUiLCJhcHBJZCI6IjYxNDBlMzMyMjliY2ExNWQxNDYxMzBhOSIsImFjdG9yIjo5LCJzY29wZXMiOlsicm9vbTpyZWFkIiwicm9vbTp3cml0ZSIsIndlYnNvY2tldDpwcmVzZW5jZSIsIndlYnNvY2tldDpzdG9yYWdlIl0sImluZm8iOnsibmFtZSI6IkNoYXJsacOpIExheW5lIiwicGljdHVyZSI6Ii9hdmF0YXJzLzcucG5nIn0sImlhdCI6MTY1MzUxNjA4NiwiZXhwIjoxNjUzNTE5Njg2fQ";
    const json = tryParseJson(b64decode(tokenPayload));

    expect(json).toEqual({
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
    expect(() => b64decode("i contain `invalid` chars")).toThrow();
    expect(() => b64decode("---")).toThrow();
  });
});

describe("remove", () => {
  test("empty", () => {
    const arr: string[] = [];
    remove(arr, "something");
    expect(arr).toEqual([]);
  });

  test("removes only the first occurrence", () => {
    const arr: number[] = [1, 2, 3, 1, 2, 3];
    remove(arr, 2);
    expect(arr).toEqual([1, 3, 1, 2, 3]);
  });
});
