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

    // Test escape handling in string backtracking
    expect(p('{"a":"test\\\\value:')).toEqual({ a: "test\\value:" });
    expect(p('{"a":"test\\\\value":')).toEqual({});

    // Test handling of input ending with colon after numeric value
    expect(p('{"a":1:')).toEqual({ a: 1 });

    // Cover escaped characters inside strings
    expect(p('{"msg":"Say \\"hello\\"')).toEqual({ msg: 'Say "hello"' });
    expect(p('{"path":"C:\\\\Users')).toEqual({ path: "C:\\Users" });

    // Cover array closing bracket stack operations
    expect(p('{"arr":[1,2]}')).toEqual({ arr: [1, 2] });
    expect(p('{"nested":[[[]]]}')).toEqual({ nested: [[[]]] });
    expect(p('{"mixed":[{"a":1}]}')).toEqual({ mixed: [{ a: 1 }] });

    // Cover error recovery logic for malformed JSON

    // Test colon removal for incomplete key-value pairs
    expect(p('{"a":1,"incomplete":')).toEqual({ a: 1 });

    // Test handling of unmatched quotes
    expect(p('{"a":1,"bad":"incomplete')).toEqual({ a: 1, bad: "incomplete" });

    // Test comma removal for trailing commas
    expect(p('{"a":1,"b":2,')).toEqual({ a: 1, b: 2 });

    // Test fallback to {} for completely malformed input
    expect(p("not json at all")).toEqual({});
    expect(p('{"completely broken syntax",}')).toEqual({});
    expect(p('{"key":"completely broken syntax",}')).toEqual({});
    expect(p('{"key","completely broken syntax",}')).toEqual({});
  });

  test("handles emojis and newlines", () => {
    // Complete emojis in strings
    expect(p('{"message":"Hello 👋 world')).toEqual({
      message: "Hello 👋 world",
    });
    expect(p('{"reaction":"🎉","status":"complete')).toEqual({
      reaction: "🎉",
      status: "complete",
    });

    // Partial/incomplete emojis (multi-byte sequences)
    expect(p('{"partial":"test 👋')).toEqual({ partial: "test 👋" });
    expect(p('{"emoji":"🎉🎊')).toEqual({ emoji: "🎉🎊" });

    // Newlines and whitespace in strings
    expect(p('{"text":"line1\\nline2')).toEqual({ text: "line1\nline2" });
    expect(p('{"multiline":"first line\\nsecond')).toEqual({
      multiline: "first line\nsecond",
    });

    // Mixed emojis, newlines, and regular content
    expect(p('{"log":"User clicked 👆\\nAction: success ✅')).toEqual({
      log: "User clicked 👆\nAction: success ✅",
    });

    // Emojis with arrays and objects
    expect(p('{"reactions":["👍","👎","❤️')).toEqual({
      reactions: ["👍", "👎", "❤️"],
    });
    expect(p('{"user":{"name":"Alice","status":"🟢 online')).toEqual({
      user: { name: "Alice", status: "🟢 online" },
    });
  });
});
