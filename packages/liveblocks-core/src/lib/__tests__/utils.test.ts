import {
  b64decode,
  compact,
  compactObject,
  entries,
  fromEntries,
  isPlainObject,
  keys,
  remove,
  tryParseJson,
  values,
} from "../utils";

describe("TypeScript wrapper utils", () => {
  it("keys (alias of Object.keys)", () => {
    expect(keys({})).toEqual([]);
    expect(keys({ a: 1 })).toEqual(["a"]);
    expect(keys({ [1]: 1, [2]: 2 })).toEqual(["1", "2"]);
  });

  it("values (alias of Object.values)", () => {
    expect(values({})).toEqual([]);
    expect(values({ a: 1 })).toEqual([1]);
    expect(values({ [1]: 1, [2]: 2 })).toEqual([1, 2]);
  });

  it("entries (alias of Object.entries)", () => {
    expect(entries({})).toEqual([]);
    expect(entries({ a: 1 })).toEqual([["a", 1]]);
    expect(entries({ [1]: 1, [2]: 2 })).toEqual([
      ["1", 1],
      ["2", 2],
    ]);
  });

  it("fromEntries (alias of Object.fromEntries)", () => {
    expect(fromEntries([])).toEqual({});
    expect(fromEntries([["a", 1]])).toEqual({ a: 1 });
    expect(
      fromEntries([
        ["1", 1],
        ["2", 2],
      ])
    ).toEqual({ [1]: 1, [2]: 2 });
  });
});

describe("compact", () => {
  it("compact w/ empty list", () => {
    expect(compact([])).toEqual([]);
  });

  it("compact removes nulls and undefined values", () => {
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
  it("compactObject w/ empty object", () => {
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

describe("isPlainObject", () => {
  it("isPlainObject", () => {
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
  it("works like JSON.parse() on legal JSON inputs", () => {
    expect(tryParseJson("true")).toEqual(true);
    expect(tryParseJson("false")).toEqual(false);
    expect(tryParseJson("null")).toEqual(null);
    expect(tryParseJson('"hi"')).toEqual("hi");
    expect(tryParseJson('["hi", {"a": 1}]')).toEqual(["hi", { a: 1 }]);
  });

  it("returns undefined for invalid JSON inputs", () => {
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
