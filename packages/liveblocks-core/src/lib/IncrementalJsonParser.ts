import type { JsonObject } from "./Json";
import { tryParseJson } from "./utils";

const EMPTY_OBJECT = Object.freeze({}) as JsonObject;

// Characters that can end partial keywords: n, u, l, t, r, e, f, a, s
const NULL_KEYWORD_CHARS = Array.from(new Set("null"));
const TRUE_KEYWORD_CHARS = Array.from(new Set("true"));
const FALSE_KEYWORD_CHARS = Array.from(new Set("false"));
const ALL_KEYWORD_CHARS = Array.from(new Set("nulltruefalse"));

/**
 * Strips the last character from `str` if it is one of the chars in the given
 * `chars` string.
 */
function stripChar(str: string, chars: string): string {
  const lastChar = str[str.length - 1];
  if (chars.includes(lastChar)) {
    return str.slice(0, -1);
  }
  return str;
}

export class IncrementalJsonParser {
  // Input
  #sourceText: string = "";

  // Output
  #cachedJson?: JsonObject;

  /** How much we've already parsed */
  #scanIndex: number = 0;
  /** Whether the last char processed was a backslash */
  #escaped: boolean = false;
  /**
   * Start position of the last unterminated string, -1 if we're not inside
   * a string currently.
   *
   * Example: '{"a": "foo'
   *                 ^
   */
  #lastUnterminatedString: number = -1;
  /**
   * Start position of the last fully terminated string we've seen.
   *
   * Example: '{"a": "foo'
   *            ^
   */
  #lastTerminatedString: number = -1;
  /** The bracket stack of expected closing chars. For input '{"a": ["foo', the stack would be ['}', ']']. */
  #stack: string[] = [];

  constructor(text: string = "") {
    this.append(text);
  }

  get source(): string {
    return this.#sourceText;
  }

  get json(): JsonObject {
    if (this.#cachedJson === undefined) {
      this.#cachedJson = this.#parse();
    }
    return this.#cachedJson;
  }

  /** Whether we're currently inside an unterminated string, e.g. '{"hello' */
  get #inString(): boolean {
    return this.#lastUnterminatedString >= 0;
  }

  append(delta: string): void {
    if (delta) {
      // Trim leading whitespace only on the first delta
      if (this.#sourceText === "") {
        delta = delta.trimStart();
      }
      this.#sourceText += delta;
      this.#cachedJson = undefined; // Invalidate the cache
    }
  }

  #autocompleteTail(output: string): string {
    // Complete unambiguous partial JSON keywords,
    // e.g. '{"a": -' → '{"a": -0'
    //      '{"a": n' → '{"a": null'
    //      '{"a": t' → '{"a": true'
    //      '{"a": f' → '{"a": false'

    if (this.#inString) {
      return ""; // Don't complete anything if we're in an unterminated string
    }

    const lastChar = output.charAt(output.length - 1);
    if (lastChar === "") return "";

    // Handle incomplete negative numbers
    if (lastChar === "-") {
      return "0"; // Complete to -0
    }

    // Skip keyword completion for most characters that can't be part of keywords
    if (!ALL_KEYWORD_CHARS.includes(lastChar)) return "";

    // Check the last few characters directly
    if (NULL_KEYWORD_CHARS.includes(lastChar)) {
      if (output.endsWith("nul")) return "l";
      if (output.endsWith("nu")) return "ll";
      if (output.endsWith("n")) return "ull";
    }

    if (TRUE_KEYWORD_CHARS.includes(lastChar)) {
      if (output.endsWith("tru")) return "e";
      if (output.endsWith("tr")) return "ue";
      if (output.endsWith("t")) return "rue";
    }

    if (FALSE_KEYWORD_CHARS.includes(lastChar)) {
      if (output.endsWith("fals")) return "e";
      if (output.endsWith("fal")) return "se";
      if (output.endsWith("fa")) return "lse";
      if (output.endsWith("f")) return "alse";
    }

    return "";
  }

  /**
   * Updates the internal parsing state by processing any new content
   * that has been appended since the last parse. This updates the state with
   * facts only. Any interpretation is left to the #parse() method.
   */
  #catchup(): void {
    const newContent = this.#sourceText.slice(this.#scanIndex);

    // Update internal parsing state by processing only the new content character by character
    for (let i = 0; i < newContent.length; i++) {
      const ch = newContent[i];
      const absolutePos = this.#scanIndex + i;

      if (this.#inString) {
        if (this.#escaped) {
          this.#escaped = false;
        } else if (ch === "\\") {
          this.#escaped = true;
        } else if (ch === '"') {
          this.#lastTerminatedString = this.#lastUnterminatedString; // Save the terminated string's start
          this.#lastUnterminatedString = -1; // Exit string
        }
      } else {
        if (ch === '"') {
          this.#lastUnterminatedString = absolutePos; // Enter string
        } else if (ch === "{") {
          this.#stack.push("}");
        } else if (ch === "[") {
          this.#stack.push("]");
        } else if (
          ch === "}" &&
          this.#stack.length > 0 &&
          this.#stack[this.#stack.length - 1] === "}"
        ) {
          this.#stack.pop();
        } else if (
          ch === "]" &&
          this.#stack.length > 0 &&
          this.#stack[this.#stack.length - 1] === "]"
        ) {
          this.#stack.pop();
        }
      }
    }

    this.#scanIndex = this.#sourceText.length;
  }

  #parse(): JsonObject {
    this.#catchup();

    let result = this.#sourceText; // Already trimmed on first append

    if (result.charAt(0) !== "{") {
      // Not an object, don't even try to parse it
      return EMPTY_OBJECT;
    }

    // If it's already valid JSON, return as-is
    if (result.endsWith("}")) {
      const quickCheck = tryParseJson(result);
      if (quickCheck) {
        // Due to the '{' check above, we can safely assume it's an object
        return quickCheck as JsonObject;
      }
    }

    // Fix unterminated strings by appending a '"' if needed
    // Use our tracked state instead of recalculating
    if (this.#inString) {
      // If we're in an escaped state (last char was \), remove that incomplete escape
      if (this.#escaped) {
        result = result.slice(0, -1); // Remove the trailing backslash
      }
      result += '"';
    }

    // If the last char is a ',' or '.', we can strip it, because it won't
    // change the value. Trim whitespace first, then check for comma/period.
    result = result.trimEnd();
    result = stripChar(result, ",.");

    // Complete partial keywords at the end (if umambiguous)
    result = result + this.#autocompleteTail(result);

    // Use the bracket stack to compute the suffix
    const suffix = this.#stack.reduceRight((acc, ch) => acc + ch, "");

    // Attempt to "just" add the missing ] and }'s.
    {
      const attempt = tryParseJson(result + suffix);
      if (attempt) {
        // If it parses, return the result
        return attempt as JsonObject;
      }
    }

    // If there is a parse failure above, it's likely because we're missing
    // a "value" for a key in an object.

    if (this.#inString) {
      // We're in an unterminated string, just remove it - e.g. '{"abc'
      result = result.slice(0, this.#lastUnterminatedString);
    } else {
      // If the last char is a ":", just remove it - e.g. '{"abc"' or '{"abc":'
      result = stripChar(result, ":");

      // If the last char is a '"', remove that last string
      if (result.endsWith('"')) {
        result = result.slice(0, this.#lastTerminatedString);
      }
    }

    // If the last char now is a trailing comma, strip it
    result = stripChar(result, ",");

    // Re-add the missing brackets/braces
    result += suffix;

    // Run JSON.parse on the result again. it should now work!
    return (tryParseJson(result) as JsonObject | undefined) ?? EMPTY_OBJECT; // Still invalid JSON
  }
}
