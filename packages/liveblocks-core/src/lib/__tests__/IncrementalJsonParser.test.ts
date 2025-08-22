import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { IncrementalJsonParser } from "../IncrementalJsonParser";

// Helper to express texts more briefly
function parse(input: string) {
  return new IncrementalJsonParser(input).json;
}

describe("IncrementalJsonParser", () => {
  test("constructor with initial value", () => {
    const parser = new IncrementalJsonParser('{"key":"value"}');
    expect(parser.source).toBe('{"key":"value"}');
    expect(parser.json).toEqual({ key: "value" });
  });

  test("basic functionality", () => {
    const parser = new IncrementalJsonParser();

    expect(parser.source).toBe("");
    expect(parser.json).toEqual({});

    parser.append('{"key":"value"}');
    expect(parser.source).toBe('{"key":"value"}');
    expect(parser.json).toEqual({ key: "value" });
  });

  test("trims leading whitespace only once", () => {
    const parser = new IncrementalJsonParser();

    // First append with leading whitespace should be trimmed
    parser.append("   {");
    expect(parser.source).toBe("{");

    // Subsequent appends should not be trimmed
    parser.append('   "key"');
    expect(parser.source).toBe('{   "key"');

    parser.append(': "value"}');
    expect(parser.source).toBe('{   "key": "value"}');
    expect(parser.json).toEqual({ key: "value" });
  });

  test("incremental parsing", () => {
    const parser = new IncrementalJsonParser();

    parser.append('{"k');
    expect(parser.json).toEqual({});

    parser.append('ey":"val');
    expect(parser.json).toEqual({ key: "val" });

    parser.append('ue"}');
    expect(parser.json).toEqual({ key: "value" });
  });

  test("bulk append produces same result as character-by-character", () => {
    const testString =
      '{"complex":{"nested":[1,2,{"deep":"value"}],"more":"data"}}';

    // Bulk append
    const parser1 = new IncrementalJsonParser(testString);
    const result1 = parser1.json;

    // Character by character
    const parser2 = new IncrementalJsonParser();
    for (const char of testString) {
      parser2.append(char);
    }
    const result2 = parser2.json;

    expect(result1).toEqual(result2);
  });
});

describe("caching behavior", () => {
  test("resulting json is cached", () => {
    const parser = new IncrementalJsonParser('{"test":12');
    const result1 = parser.json;
    const result2 = parser.json;
    expect(result1).toBe(result2);
  });

  test("cache is invalidated when text is appended", () => {
    const parser = new IncrementalJsonParser('{"test":12');
    const result1 = parser.json;
    parser.append("3");
    expect(result1).not.toEqual(parser.json);
  });
});

describe("parsing basic inputs", () => {
  test("basic cases", () => {
    expect(parse("")).toEqual({});
    expect(parse(" ")).toEqual({});
    expect(parse("{")).toEqual({});
    expect(parse('{"key"')).toEqual({});
    expect(parse('{"key')).toEqual({});
    expect(parse('{"key":')).toEqual({});
    expect(parse('{"key":""')).toEqual({ key: "" });
    expect(parse('{"key":"')).toEqual({ key: "" });
    expect(parse('{"key":0')).toEqual({ key: 0 });
    expect(parse('{"key":"hi')).toEqual({ key: "hi" });
    expect(parse('{"key":"value"')).toEqual({ key: "value" });
    expect(parse('{"key":"value"}')).toEqual({ key: "value" });
  });

  test("arrays", () => {
    expect(parse('{"arr":[')).toEqual({ arr: [] });
    expect(parse('{"arr":[1')).toEqual({ arr: [1] });
    expect(parse('{"arr":[1,')).toEqual({ arr: [1] });
    expect(parse('{"arr":["hi')).toEqual({ arr: ["hi"] });
    expect(parse('{"arr":["hi"')).toEqual({ arr: ["hi"] });
    expect(parse('{"arr":["hi"]')).toEqual({ arr: ["hi"] });
    expect(parse('{"arr":[1,2,3')).toEqual({ arr: [1, 2, 3] });
  });

  test("nested structures", () => {
    expect(parse('{"arr":[')).toEqual({ arr: [] });
    expect(parse('{"arr":[{')).toEqual({ arr: [{}] });
    expect(parse('{"arr":[{"nested"')).toEqual({ arr: [{}] });
    expect(parse('{"arr":[{"nested":')).toEqual({ arr: [{}] });
    expect(parse('{"arr":[{"nested":42')).toEqual({ arr: [{ nested: 42 }] });
  });

  test("mixed nesting", () => {
    expect(parse('{"a":[1,{"b":')).toEqual({ a: [1, {}] });
    expect(parse('{"a":[1,{"b":[')).toEqual({ a: [1, { b: [] }] });
    expect(parse('{"a":{"b":["c"')).toEqual({ a: { b: ["c"] } });
  });

  test("strings with special characters", () => {
    expect(parse('{"key":"val\\n')).toEqual({ key: "val\n" });
    expect(parse('{"key":"val\\"')).toEqual({ key: 'val"' });
    expect(parse('{"key":"val w/ spaces')).toEqual({ key: "val w/ spaces" });
    expect(parse('{"unicode":"café')).toEqual({ unicode: "café" });
    expect(parse('{"key":"val\\\\n')).toEqual(parse('{"key":"val\\\\n'));
  });

  test("numbers", () => {
    expect(parse('{"num":123')).toEqual({ num: 123 });
    expect(parse('{"num":123.')).toEqual({ num: 123 });
    expect(parse('{"num":-42')).toEqual({ num: -42 });
    expect(parse('{"pi":3.')).toEqual({ pi: 3 });
    expect(parse('{"pi":3.14')).toEqual({ pi: 3.14 });
  });

  test("complex real-world examples", () => {
    expect(parse('{"users":[{"id":1,"name":"John')).toEqual({
      users: [{ id: 1, name: "John" }],
    });
    expect(parse('{"config":{"debug":true,"timeout":')).toEqual({
      config: { debug: true },
    });
    expect(parse('{"data":[{"items":[{"type":"text","content":')).toEqual({
      data: [{ items: [{ type: "text" }] }],
    });
  });

  test("edge cases for coverage", () => {
    // Test properly closed nested objects to trigger stack.pop for '}'
    expect(parse('{"a":{"b":{}}')).toEqual({ a: { b: {} } });
    expect(parse('{"nested":{"deep":{"obj":{}}}}')).toEqual({
      nested: { deep: { obj: {} } },
    });

    // Test escaped characters at end of incomplete strings
    expect(parse('{"key":"val\\"')).toEqual({ key: 'val"' });
    expect(parse('{"key":"val\\\\"')).toEqual({ key: "val\\" });
    expect(parse('{"esc":"test\\\\')).toEqual({ esc: "test\\" });

    // Test combination of escapes and incomplete structure
    expect(parse('{"a":"b\\\\","c":')).toEqual({ a: "b\\" });

    // Test escape handling in string backtracking
    expect(parse('{"a":"test\\\\value:')).toEqual({ a: "test\\value:" });
    expect(parse('{"a":"test\\\\value":')).toEqual({});

    // Test handling of input ending with colon after numeric value
    expect(parse('{"a":1:')).toEqual({ a: 1 });

    // Cover escaped characters inside strings
    expect(parse('{"msg":"Say \\"hello\\"')).toEqual({ msg: 'Say "hello"' });
    expect(parse('{"path":"C:\\\\Users')).toEqual({ path: "C:\\Users" });

    // Escape char at the end of input
    expect(parse('{"a":"e\\')).toEqual({ a: "e" });

    // Cover array closing bracket stack operations
    expect(parse('{"arr":[1,2]}')).toEqual({ arr: [1, 2] });
    expect(parse('{"nested":[[[]]]}')).toEqual({ nested: [[[]]] });
    expect(parse('{"mixed":[{"a":1}]}')).toEqual({ mixed: [{ a: 1 }] });

    // Cover error recovery logic for malformed JSON

    // Test colon removal for incomplete key-value pairs
    expect(parse('{"a":1,"incomplete":')).toEqual({ a: 1 });

    // Test handling of unmatched quotes
    expect(parse('{"a":1,"bad":"incomplete')).toEqual({
      a: 1,
      bad: "incomplete",
    });

    // Test comma removal for trailing commas
    expect(parse('{"a":1,"b":2,')).toEqual({ a: 1, b: 2 });
    expect(parse('{"foo": "bar", ')).toEqual({ foo: "bar" });

    // Test fallback to {} for completely malformed input
    expect(parse("not json at all")).toEqual({});
    expect(parse('{"completely broken syntax",}')).toEqual({});
    expect(parse('{"key":"completely broken syntax",}')).toEqual({});
    expect(parse('{"key","completely broken syntax",}')).toEqual({});
  });

  test("handles trailing whitespace", () => {
    expect(parse('{"key":"value"}  \n\t')).toEqual({ key: "value" });
    expect(parse('{"key":"value"}   ')).toEqual({ key: "value" });
    expect(parse('{"a":1,"b":2} \n ')).toEqual({ a: 1, b: 2 });
    expect(parse('{"nested":{"obj":{}}}  ')).toEqual({ nested: { obj: {} } });
  });

  test("handles emojis and newlines", () => {
    // Complete emojis in strings
    expect(parse('{"message":"Hello 👋 world')).toEqual({
      message: "Hello 👋 world",
    });
    expect(parse('{"reaction":"🎉","status":"complete')).toEqual({
      reaction: "🎉",
      status: "complete",
    });

    // Partial/incomplete emojis (multi-byte sequences)
    expect(parse('{"partial":"test 👋')).toEqual({ partial: "test 👋" });
    expect(parse('{"emoji":"🎉🎊')).toEqual({ emoji: "🎉🎊" });

    // Newlines and whitespace in strings
    expect(parse('{"text":"line1\\nline2')).toEqual({ text: "line1\nline2" });
    expect(parse('{"multiline":"first line\\nsecond')).toEqual({
      multiline: "first line\nsecond",
    });

    // Mixed emojis, newlines, and regular content
    expect(parse('{"log":"User clicked 👆\\nAction: success ✅')).toEqual({
      log: "User clicked 👆\nAction: success ✅",
    });

    // Emojis with arrays and objects
    expect(parse('{"reactions":["👍","👎","❤️')).toEqual({
      reactions: ["👍", "👎", "❤️"],
    });
    expect(parse('{"user":{"name":"Alice","status":"🟢 online')).toEqual({
      user: { name: "Alice", status: "🟢 online" },
    });
  });
});

describe("partial keyword recognition", () => {
  test("recognizes partial null keyword", () => {
    expect(parse('{"key":n')).toEqual({ key: null });
    expect(parse('{"key":nu')).toEqual({ key: null });
    expect(parse('{"key":nul')).toEqual({ key: null });
  });

  test("recognizes partial true keyword", () => {
    expect(parse('{"key":t')).toEqual({ key: true });
    expect(parse('{"key":tr')).toEqual({ key: true });
    expect(parse('{"key":tru')).toEqual({ key: true });
  });

  test("recognizes partial false keyword", () => {
    expect(parse('{"key":f')).toEqual({ key: false });
    expect(parse('{"key":fa')).toEqual({ key: false });
    expect(parse('{"key":fal')).toEqual({ key: false });
    expect(parse('{"key":fals')).toEqual({ key: false });
  });

  test("recognizes partial keywords in arrays", () => {
    expect(parse('{"arr":[t')).toEqual({ arr: [true] });
    expect(parse('{"arr":[n')).toEqual({ arr: [null] });
    expect(parse('{"arr":[f')).toEqual({ arr: [false] });
  });

  test("recognizes partial keywords after commas", () => {
    expect(parse('{"arr":[true,f')).toEqual({ arr: [true, false] });
    expect(parse('{"a":1,"b":n')).toEqual({ a: 1, b: null });
  });

  test("does not complete keywords in strings", () => {
    // This should not complete "n" to "null" because it's inside a string
    expect(parse('{"key":"n')).toEqual({ key: "n" });
  });

  test("fixes the original counterexample", () => {
    // This was the counterexample that revealed the issue
    const input = '{"":false," ":null}';
    const parser = new IncrementalJsonParser();
    let maxLen = 0;

    // Append character by character and track the monotonic property
    for (let i = 0; i < input.length; i++) {
      parser.append(input[i]);
      const result = parser.json;
      const len = JSON.stringify(result).length;

      // Output length should never shrink - only stay equal or grow
      expect(len).toBeGreaterThanOrEqual(maxLen);
      maxLen = Math.max(maxLen, len);
    }

    // The final result should be correct
    expect(parser.json).toEqual({ "": false, " ": null });
  });
});

describe("property-based testing", () => {
  test("regression: escaped chars in keys", () => {
    const parser = new IncrementalJsonParser('{"\\"":1');
    expect(parser.json).toEqual({ '"': 1 });
  });

  test("regression: escaped chars in keys when appended", () => {
    const parser = new IncrementalJsonParser('{"\\"');
    expect(parser.json).toEqual({});
    parser.append('":1');
    expect(parser.json).toEqual({ '"': 1 });
  });

  test("regression: parsing positive decimal numbers", () => {
    const parser = new IncrementalJsonParser('{" ":');
    expect(parser.json).toEqual({});
    parser.append("0.007");
    expect(parser.json).toEqual({ " ": 0.007 });
  });

  test("regression: parsing negative decimal numbers", () => {
    const parser = new IncrementalJsonParser('{"x":');
    expect(parser.json).toEqual({});
    parser.append("-0.007");
    expect(parser.json).toEqual({ x: -0.007 });
  });

  test("regression: incomplete negative number (minus only)", () => {
    const parser = new IncrementalJsonParser('{"x":');
    expect(parser.json).toEqual({});
    parser.append("-");
    expect(parser.json).toEqual({ x: -0 });
    parser.append("0");
    expect(parser.json).toEqual({ x: -0 });
    parser.append(".");
    expect(parser.json).toEqual({ x: -0 });
    parser.append("00");
    expect(parser.json).toEqual({ x: -0 });
    parser.append("7");
    expect(parser.json).toEqual({ x: -0.007 });
  });

  test("parsing left-to-right should only ever increment output", () => {
    fc.assert(
      fc.property(
        // Generate a valid JSON object, as a string
        fc
          .jsonValue()
          .filter(
            (obj) =>
              obj !== null && typeof obj === "object" && !Array.isArray(obj)
          )
          .map((obj) => JSON.stringify(obj))
          .filter((str) => !str.includes("e")), // Filter out scientific notation

        fc.context(),

        (input, ctx) => {
          const parser = new IncrementalJsonParser();
          let maxLen = 0;

          // Append character by character
          // No matter what the input is, we should never see the output shrink
          for (let i = 0; i < input.length; i++) {
            parser.append(input[i]);
            const result = parser.json;
            const len = JSON.stringify(result).length;

            // Output length should never shrink - only stay equal or grow
            if (len < maxLen) {
              ctx.log(`Parsed so far: ${input.slice(0, i)}`);
              ctx.log(`Next char: ${input[i]}`);
              ctx.log(
                `❌ FAILURE: Output shrank from ${maxLen} to ${len} at position ${i}`
              );
              return false;
            }

            maxLen = Math.max(maxLen, len);
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
