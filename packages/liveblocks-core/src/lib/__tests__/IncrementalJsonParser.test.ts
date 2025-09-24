import fc from "fast-check";
import { assertEq, assertSame } from "tosti";
import { describe, expect, test } from "vitest";

import { IncrementalJsonParser } from "../IncrementalJsonParser";

// Helper to express tests more briefly
function parse(input: string) {
  return new IncrementalJsonParser(input).json;
}

describe("IncrementalJsonParser", () => {
  test("constructor with initial value", () => {
    const parser = new IncrementalJsonParser('{"key":"value"}');
    assertSame(parser.source, '{"key":"value"}');
    assertEq(parser.json, { key: "value" });
  });

  test("basic functionality", () => {
    const parser = new IncrementalJsonParser();

    assertSame(parser.source, "");
    assertEq(parser.json, {});

    parser.append('{"key":"value"}');
    assertSame(parser.source, '{"key":"value"}');
    assertEq(parser.json, { key: "value" });
  });

  test("trims leading whitespace only once", () => {
    const parser = new IncrementalJsonParser();

    // First append with leading whitespace should be trimmed
    parser.append("   {");
    assertSame(parser.source, "{");

    // Subsequent appends should not be trimmed
    parser.append('   "key"');
    assertSame(parser.source, '{   "key"');

    parser.append(': "value"}');
    assertSame(parser.source, '{   "key": "value"}');
    assertEq(parser.json, { key: "value" });
  });

  test("incremental parsing", () => {
    const parser = new IncrementalJsonParser();

    parser.append('{"k');
    assertEq(parser.json, {});

    parser.append('ey":"val');
    assertEq(parser.json, { key: "val" });

    parser.append('ue"}');
    assertEq(parser.json, { key: "value" });
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

    assertEq(result1, result2);
  });
});

describe("caching behavior", () => {
  test("resulting json is cached", () => {
    const parser = new IncrementalJsonParser('{"test":12');
    const result1 = parser.json;
    const result2 = parser.json;
    assertSame(result1, result2);
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
    assertEq(parse(""), {});
    assertEq(parse(" "), {});
    assertEq(parse("{"), {});
    assertEq(parse('{"key"'), {});
    assertEq(parse('{"key'), {});
    assertEq(parse('{"key":'), {});
    assertEq(parse('{"key":""'), { key: "" });
    assertEq(parse('{"key":"'), { key: "" });
    assertEq(parse('{"key":0'), { key: 0 });
    assertEq(parse('{"key":"hi'), { key: "hi" });
    assertEq(parse('{"key":"value"'), { key: "value" });
    assertEq(parse('{"key":"value"}'), { key: "value" });
  });

  test("arrays", () => {
    assertEq(parse('{"arr":['), { arr: [] });
    assertEq(parse('{"arr":[1'), { arr: [1] });
    assertEq(parse('{"arr":[1,'), { arr: [1] });
    assertEq(parse('{"arr":["hi'), { arr: ["hi"] });
    assertEq(parse('{"arr":["hi"'), { arr: ["hi"] });
    assertEq(parse('{"arr":["hi"]'), { arr: ["hi"] });
    assertEq(parse('{"arr":[1,2,3'), { arr: [1, 2, 3] });
  });

  test("nested structures", () => {
    assertEq(parse('{"arr":['), { arr: [] });
    assertEq(parse('{"arr":[{'), { arr: [{}] });
    assertEq(parse('{"arr":[{"nested"'), { arr: [{}] });
    assertEq(parse('{"arr":[{"nested":'), { arr: [{}] });
    assertEq(parse('{"arr":[{"nested":42'), { arr: [{ nested: 42 }] });
  });

  test("mixed nesting", () => {
    assertEq(parse('{"a":[1,{"b":'), { a: [1, {}] });
    assertEq(parse('{"a":[1,{"b":['), { a: [1, { b: [] }] });
    assertEq(parse('{"a":{"b":["c"'), { a: { b: ["c"] } });
  });

  test("strings with special characters", () => {
    assertEq(parse('{"key":"val\\n'), { key: "val\n" });
    assertEq(parse('{"key":"val\\"'), { key: 'val"' });
    assertEq(parse('{"key":"val w/ spaces'), { key: "val w/ spaces" });
    assertEq(parse('{"unicode":"café'), { unicode: "café" });
    assertEq(parse('{"key":"val\\\\n'), parse('{"key":"val\\\\n'));
  });

  test("numbers", () => {
    assertEq(parse('{"num":123'), { num: 123 });
    assertEq(parse('{"num":123.'), { num: 123 });
    assertEq(parse('{"num":-42'), { num: -42 });
    assertEq(parse('{"pi":3.'), { pi: 3 });
    assertEq(parse('{"pi":3.14'), { pi: 3.14 });
  });

  test("complex real-world examples", () => {
    assertEq(parse('{"users":[{"id":1,"name":"John'), {
      users: [{ id: 1, name: "John" }],
    });
    assertEq(parse('{"config":{"debug":true,"timeout":'), {
      config: { debug: true },
    });
    assertEq(parse('{"data":[{"items":[{"type":"text","content":'), {
      data: [{ items: [{ type: "text" }] }],
    });
  });

  test("edge cases for coverage", () => {
    // Test properly closed nested objects to trigger stack.pop for '}'
    assertEq(parse('{"a":{"b":{}}'), { a: { b: {} } });
    assertEq(parse('{"nested":{"deep":{"obj":{}}}}'), {
      nested: { deep: { obj: {} } },
    });

    // Test escaped characters at end of incomplete strings
    assertEq(parse('{"key":"val\\"'), { key: 'val"' });
    assertEq(parse('{"key":"val\\\\"'), { key: "val\\" });
    assertEq(parse('{"esc":"test\\\\'), { esc: "test\\" });

    // Test combination of escapes and incomplete structure
    assertEq(parse('{"a":"b\\\\","c":'), { a: "b\\" });

    // Test escape handling in string backtracking
    assertEq(parse('{"a":"test\\\\value:'), { a: "test\\value:" });
    assertEq(parse('{"a":"test\\\\value":'), {});

    // Test handling of input ending with colon after numeric value
    assertEq(parse('{"a":1:'), { a: 1 });

    // Cover escaped characters inside strings
    assertEq(parse('{"msg":"Say \\"hello\\"'), { msg: 'Say "hello"' });
    assertEq(parse('{"path":"C:\\\\Users'), { path: "C:\\Users" });

    // Escape char at the end of input
    assertEq(parse('{"a":"e\\'), { a: "e" });

    // Cover array closing bracket stack operations
    assertEq(parse('{"arr":[1,2]}'), { arr: [1, 2] });
    assertEq(parse('{"nested":[[[]]]}'), { nested: [[[]]] });
    assertEq(parse('{"mixed":[{"a":1}]}'), { mixed: [{ a: 1 }] });

    // Cover error recovery logic for malformed JSON

    // Test colon removal for incomplete key-value pairs
    assertEq(parse('{"a":1,"incomplete":'), { a: 1 });

    // Test handling of unmatched quotes
    assertEq(parse('{"a":1,"bad":"incomplete'), {
      a: 1,
      bad: "incomplete",
    });

    // Test comma removal for trailing commas
    assertEq(parse('{"a":1,"b":2,'), { a: 1, b: 2 });
    assertEq(parse('{"foo": "bar", '), { foo: "bar" });

    // Test fallback to {} for completely malformed input
    assertEq(parse("not json at all"), {});
    assertEq(parse('{"completely broken syntax",}'), {});
    assertEq(parse('{"key":"completely broken syntax",}'), {});
    assertEq(parse('{"key","completely broken syntax",}'), {});
  });

  test("handles trailing whitespace", () => {
    assertEq(parse('{"key":"value"}  \n\t'), { key: "value" });
    assertEq(parse('{"key":"value"}   '), { key: "value" });
    assertEq(parse('{"a":1,"b":2} \n '), { a: 1, b: 2 });
    assertEq(parse('{"nested":{"obj":{}}}  '), { nested: { obj: {} } });
  });

  test("handles emojis and newlines", () => {
    // Complete emojis in strings
    assertEq(parse('{"message":"Hello 👋 world'), {
      message: "Hello 👋 world",
    });
    assertEq(parse('{"reaction":"🎉","status":"complete'), {
      reaction: "🎉",
      status: "complete",
    });

    // Partial/incomplete emojis (multi-byte sequences)
    assertEq(parse('{"partial":"test 👋'), { partial: "test 👋" });
    assertEq(parse('{"emoji":"🎉🎊'), { emoji: "🎉🎊" });

    // Newlines and whitespace in strings
    assertEq(parse('{"text":"line1\\nline2'), { text: "line1\nline2" });
    assertEq(parse('{"multiline":"first line\\nsecond'), {
      multiline: "first line\nsecond",
    });

    // Mixed emojis, newlines, and regular content
    assertEq(parse('{"log":"User clicked 👆\\nAction: success ✅'), {
      log: "User clicked 👆\nAction: success ✅",
    });

    // Emojis with arrays and objects
    assertEq(parse('{"reactions":["👍","👎","❤️'), {
      reactions: ["👍", "👎", "❤️"],
    });
    assertEq(parse('{"user":{"name":"Alice","status":"🟢 online'), {
      user: { name: "Alice", status: "🟢 online" },
    });
  });
});

describe("partial keyword recognition", () => {
  test("recognizes partial null keyword", () => {
    assertEq(parse('{"key":n'), { key: null });
    assertEq(parse('{"key":nu'), { key: null });
    assertEq(parse('{"key":nul'), { key: null });
  });

  test("recognizes partial true keyword", () => {
    assertEq(parse('{"key":t'), { key: true });
    assertEq(parse('{"key":tr'), { key: true });
    assertEq(parse('{"key":tru'), { key: true });
  });

  test("recognizes partial false keyword", () => {
    assertEq(parse('{"key":f'), { key: false });
    assertEq(parse('{"key":fa'), { key: false });
    assertEq(parse('{"key":fal'), { key: false });
    assertEq(parse('{"key":fals'), { key: false });
  });

  test("recognizes partial keywords in arrays", () => {
    assertEq(parse('{"arr":[t'), { arr: [true] });
    assertEq(parse('{"arr":[n'), { arr: [null] });
    assertEq(parse('{"arr":[f'), { arr: [false] });
  });

  test("recognizes partial keywords after commas", () => {
    assertEq(parse('{"arr":[true,f'), { arr: [true, false] });
    assertEq(parse('{"a":1,"b":n'), { a: 1, b: null });
  });

  test("does not complete keywords in strings", () => {
    // This should not complete "n" to "null" because it's inside a string
    assertEq(parse('{"key":"n'), { key: "n" });
  });

  test("fixes the original counterexample", () => {
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
    assertEq(parser.json, { "": false, " ": null });
  });
});

describe("property-based testing", () => {
  test("regression: escaped chars in keys", () => {
    const parser = new IncrementalJsonParser('{"\\"":1');
    assertEq(parser.json, { '"': 1 });
  });

  test("regression: escaped chars in keys when appended", () => {
    const parser = new IncrementalJsonParser('{"\\"');
    assertEq(parser.json, {});
    parser.append('":1');
    assertEq(parser.json, { '"': 1 });
  });

  test("regression: parsing positive decimal numbers", () => {
    const parser = new IncrementalJsonParser('{" ":');
    assertEq(parser.json, {});
    parser.append("0.007");
    assertEq(parser.json, { " ": 0.007 });
  });

  test("regression: parsing negative decimal numbers", () => {
    const parser = new IncrementalJsonParser('{"x":');
    assertEq(parser.json, {});
    parser.append("-0.007");
    assertEq(parser.json, { x: -0.007 });
  });

  test("regression: incomplete negative number (minus only)", () => {
    const parser = new IncrementalJsonParser('{"x":');
    assertEq(parser.json, {});
    parser.append("-");
    assertEq(parser.json, { x: -0 });
    parser.append("0");
    assertEq(parser.json, { x: -0 });
    parser.append(".");
    assertEq(parser.json, { x: -0 });
    parser.append("00");
    assertEq(parser.json, { x: -0 });
    parser.append("7");
    assertEq(parser.json, { x: -0.007 });
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
