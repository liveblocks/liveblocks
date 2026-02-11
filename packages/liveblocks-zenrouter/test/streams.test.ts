import { describe, expect, test } from "vitest";

import {
  jsonArrayStream,
  ndjsonStream,
  textStream,
} from "~/responses/index.js";

async function readStream(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  return result;
}

describe("textStream", () => {
  test("streams from iterable", async () => {
    function* chunks() {
      yield "hello";
      yield " ";
      yield "world";
    }

    const response = textStream(chunks());
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("hello world");
  });

  test("respects custom headers", () => {
    const response = textStream(["ok"], { "X-Custom": "value" });
    expect(response.headers.get("X-Custom")).toBe("value");
  });

  test("handles empty iterable", async () => {
    const response = textStream([]);
    expect(await readStream(response)).toBe("");
  });

  test("works with JSON content-type header", async () => {
    function* generate() {
      yield "[";
      yield JSON.stringify({ id: 1 });
      yield ",";
      yield JSON.stringify({ id: 2 });
      yield "]";
    }

    const response = textStream(generate(), {
      "Content-Type": "application/json; charset=utf-8",
    });
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8"
    );
    await expect(response.json()).resolves.toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("response.json() fails for invalid JSON content", async () => {
    const response = textStream(["not valid json"]);
    await expect(response.json()).rejects.toThrow(SyntaxError);
  });
});

describe("ndjsonStream", () => {
  test("sets ndjson content-type", () => {
    const response = ndjsonStream([]);
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
  });

  test("streams iterable as newline-delimited JSON", async () => {
    function* values() {
      yield { id: 1, name: "Alice" };
      yield { id: 2, name: "Bob" };
      yield [1, 2, 3];
    }

    const response = ndjsonStream(values());
    const body = await response.text();
    expect(body).toBe(
      '{"id":1,"name":"Alice"}\n{"id":2,"name":"Bob"}\n[1,2,3]\n'
    );
  });

  test("handles primitive JSON values", async () => {
    const response = ndjsonStream([42, "hello", true, null]);
    const body = await response.text();
    expect(body).toBe('42\n"hello"\ntrue\nnull\n');
  });

  test("preserves custom headers", () => {
    const response = ndjsonStream([], { "X-Custom": "value" });
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    expect(response.headers.get("X-Custom")).toBe("value");
  });
});

describe("jsonArrayStream", () => {
  test("sets json content-type", () => {
    const response = jsonArrayStream([]);
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8"
    );
  });

  test("streams empty array", async () => {
    const response = jsonArrayStream([]);
    await expect(response.json()).resolves.toEqual([]);
  });

  test("streams single value", async () => {
    const response = jsonArrayStream([{ id: 1 }]);
    await expect(response.json()).resolves.toEqual([{ id: 1 }]);
  });

  test("streams multiple values with commas", async () => {
    function* values() {
      yield { id: 1, name: "Alice" };
      yield { id: 2, name: "Bob" };
      yield { id: 3, name: "Charlie" };
    }

    const response = jsonArrayStream(values());
    await expect(response.json()).resolves.toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
  });

  test("handles primitive JSON values", async () => {
    const response = jsonArrayStream([42, "hello", true, null]);
    await expect(response.json()).resolves.toEqual([42, "hello", true, null]);
  });

  test("preserves custom headers", () => {
    const response = jsonArrayStream([], { "X-Custom": "value" });
    expect(response.headers.get("Content-Type")).toBe(
      "application/json; charset=utf-8"
    );
    expect(response.headers.get("X-Custom")).toBe("value");
  });
});
