import { describe, expect, test } from "vitest";

import { parsePartialJsonObject as p } from "../parsePartialJsonObject";

describe("parsePartialJsonObject", () => {
  test("basic cases", () => {
    expect(p("")).toEqual({});
    expect(p(" ")).toEqual({});
    expect(p("{")).toEqual({});
    expect(p('{"key"')).toEqual({});
    expect(p('{"key')).toEqual({});
    expect(p('{"key":')).toEqual({});
    expect(p('{"key":""')).toEqual({ key: "" });
    expect(p('{"key":"')).toEqual({ key: "" });
    expect(p('{"key":0')).toEqual({ key: 0 });
    expect(p('{"key":"hi')).toEqual({ key: "hi" });
    expect(p('{"key":"value"')).toEqual({ key: "value" });
    expect(p('{"key":"value"}')).toEqual({ key: "value" });
  });

  test("arrays", () => {
    expect(p('{"arr":[')).toEqual({ arr: [] });
    expect(p('{"arr":[1')).toEqual({ arr: [1] });
    expect(p('{"arr":[1,')).toEqual({ arr: [1] });
    expect(p('{"arr":["hi')).toEqual({ arr: ["hi"] });
    expect(p('{"arr":["hi"')).toEqual({ arr: ["hi"] });
    expect(p('{"arr":["hi"]')).toEqual({ arr: ["hi"] });
    expect(p('{"arr":[1,2,3')).toEqual({ arr: [1, 2, 3] });
  });

  test("nested structures", () => {
    expect(p('{"arr":[')).toEqual({ arr: [] });
    expect(p('{"arr":[{')).toEqual({ arr: [{}] });
    expect(p('{"arr":[{"nested"')).toEqual({ arr: [{}] });
    expect(p('{"arr":[{"nested":')).toEqual({ arr: [{}] });
    expect(p('{"arr":[{"nested":42')).toEqual({ arr: [{ nested: 42 }] });
  });

  test("mixed nesting", () => {
    expect(p('{"a":[1,{"b":')).toEqual({ a: [1, {}] });
    expect(p('{"a":[1,{"b":[')).toEqual({ a: [1, { b: [] }] });
    expect(p('{"a":{"b":["c"')).toEqual({ a: { b: ["c"] } });
  });

  test("strings with special characters", () => {
    expect(p('{"key":"val\\n')).toEqual({ key: "val\n" });
    expect(p('{"key":"val\\"')).toEqual({ key: 'val"' });
    expect(p('{"key":"val with spaces')).toEqual({ key: "val with spaces" });
    expect(p('{"unicode":"café')).toEqual({ unicode: "café" });
  });

  test("numbers", () => {
    expect(p('{"num":123')).toEqual({ num: 123 });
    expect(p('{"num":123.')).toEqual({ num: 123 });
    expect(p('{"num":-42')).toEqual({ num: -42 });
    expect(p('{"pi":3.')).toEqual({ pi: 3 });
    expect(p('{"pi":3.14')).toEqual({ pi: 3.14 });
  });

  test("complex real-world examples", () => {
    expect(p('{"users":[{"id":1,"name":"John')).toEqual({
      users: [{ id: 1, name: "John" }],
    });
    expect(p('{"config":{"debug":true,"timeout":')).toEqual({
      config: { debug: true },
    });
    expect(p('{"data":[{"items":[{"type":"text","content":')).toEqual({
      data: [{ items: [{ type: "text" }] }],
    });
  });

  test("edge cases for coverage", () => {
    // Test properly closed nested objects to trigger stack.pop for '}'
    expect(p('{"a":{"b":{}}')).toEqual({ a: { b: {} } });
    expect(p('{"nested":{"deep":{"obj":{}}}}')).toEqual({
      nested: { deep: { obj: {} } },
    });

    // Test escaped characters at end of incomplete strings
    expect(p('{"key":"val\\"')).toEqual({ key: 'val"' });
    expect(p('{"key":"val\\\\"')).toEqual({ key: "val\\" });
    expect(p('{"esc":"test\\\\')).toEqual({ esc: "test\\" });

    // Test combination of escapes and incomplete structure
    expect(p('{"a":"b\\\\","c":')).toEqual({ a: "b\\" });

    // Test to cover escape handling in backtracking (lines 120, 122)
    expect(p('{"a":"test\\\\value:')).toEqual({ a: "test\\value:" });
    expect(p('{"a":"test\\\\value":')).toEqual({});

    // Test to cover the false branch of line 113 (endsWith('"') after removing ':')
    // Input ending with number followed by colon (rare but possible in malformed JSON)
    expect(p('{"a":1:')).toEqual({ a: 1 });
  });
});
