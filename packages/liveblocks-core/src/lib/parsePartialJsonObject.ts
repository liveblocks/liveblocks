import type { JsonObject } from "./Json";
import { tryParseJson } from "./utils";

export function parsePartialJsonObject(partial: string): JsonObject {
  partial = partial.trimStart();

  if (partial.charAt(0) !== "{") {
    // Not an object, don't even try to parse it
    return {};
  }

  // If it's already valid JSON, return as-is
  {
    const quickCheck = tryParseJson(partial);
    if (quickCheck) {
      // Due to the '{' check above, we can safely assume it's an object
      return quickCheck as JsonObject;
    }
  }

  let result = partial;

  // 1. Fix unclosed strings by appending a '"' if needed
  let quoteCount = 0;
  let escaped = false;
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    if (escaped) {
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      quoteCount++;
    }
  }

  if (quoteCount % 2 === 1) {
    result += '"';
  }

  // 2. Trim whitespace at the end
  result = result.trimEnd();

  // 3. If the last char is a ',', strip it
  if (result.endsWith(",")) {
    result = result.slice(0, -1);
  }

  // 4. If the last char is a '.', strip it
  if (result.endsWith(".")) {
    result = result.slice(0, -1);
  }

  // 5. Go from left to right and collect '[' and '{' in a stack
  const stack: string[] = [];
  let inString = false;
  escaped = false;

  for (let i = 0; i < result.length; i++) {
    const char = result[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        stack.push("}");
      } else if (char === "[") {
        stack.push("]");
      } else if (
        char === "}" &&
        stack.length > 0 &&
        stack[stack.length - 1] === "}"
      ) {
        stack.pop();
      } else if (
        char === "]" &&
        stack.length > 0 &&
        stack[stack.length - 1] === "]"
      ) {
        stack.pop();
      }
    }
  }

  // 6. Build the suffix string from the stack
  const suffix = stack.reverse().join("");

  // 7. Attempt to "just" add the missing ] and }'s.
  {
    const attempt = tryParseJson(result + suffix);
    if (attempt) {
      // If it parses, return the result
      return attempt as JsonObject;
    }
  }

  // 8. If there is a parse failure, it's likely because we're missing a "value" for a key in an object.

  // a. if the last char is a ":" remove it
  if (result.endsWith(":")) {
    result = result.slice(0, -1);
  }

  // b. if the last char now is a '"', remove that last string
  if (result.endsWith('"')) {
    let pos = result.length - 2; // Start before the closing quote
    escaped = false;

    // Scan back to find the opening quote, accounting for escaping
    while (pos >= 0) {
      if (escaped) {
        escaped = false;
      } else if (result[pos] === "\\") {
        escaped = true;
      } else if (result[pos] === '"') {
        // Found the opening quote
        result = result.slice(0, pos);
        break;
      }
      pos--;
    }
  }

  // c. if the last char now is a ',', strip it
  if (result.endsWith(",")) {
    result = result.slice(0, -1);
  }

  // Re-add the missing brackets/braces
  result += suffix;

  // 10. Run JSON.parse on the result again. it should now work!
  return (tryParseJson(result) as JsonObject | undefined) ?? {}; // Still invalid JSON
}
