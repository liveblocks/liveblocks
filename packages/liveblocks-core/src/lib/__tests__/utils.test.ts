import { compact, b64decode, tryParseJson } from "../utils";

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
});
