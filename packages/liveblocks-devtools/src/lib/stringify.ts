import type { Json } from "@liveblocks/core";
import unquotedPropertyValidator from "unquoted-property-validator";

const SEPARATOR = ", ";

export function stringify(value?: Json, depth = 0, maxDepth = 1): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    } else if (depth >= maxDepth) {
      return "[…]";
    } else {
      const values = value
        .map((value) => stringify(value, depth + 1))
        .join(SEPARATOR);

      return `[${values}]`;
    }
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);

    if (keys.length === 0) {
      return "{}";
    } else if (depth >= maxDepth) {
      return "{ … }";
    } else {
      const values = keys
        .map((key) => {
          const formattedKey = unquotedPropertyValidator(key).needsQuotes
            ? `"${key}"`
            : key;

          return `${formattedKey}: ${stringify(value[key], depth + 1)}`;
        })
        .join(SEPARATOR);

      return `{ ${values} }`;
    }
  } else {
    return JSON.stringify(value);
  }
}
