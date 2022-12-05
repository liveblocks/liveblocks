import type { Json } from "@liveblocks/core";
import unquotedPropertyValidator from "unquoted-property-validator";

export const SEPARATOR = ", ";
export const ELLIPSIS = "…";

export function quoteAsNeeded(key: string | number) {
  return unquotedPropertyValidator(String(key)).needsQuotes ? `"${key}"` : key;
}

export function wrapProperty(key: string | number, value: string) {
  return `${`${quoteAsNeeded(key)}: ${value}`}`;
}

export function wrapArray(values?: string) {
  return `[${values}]`;
}

export function wrapObject(values?: string) {
  return values ? `{ ${values} }` : "{}";
}

export function stringify(value?: Json, depth = 0, maxDepth = 1): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return wrapArray();
    } else if (depth >= maxDepth) {
      return wrapArray(ELLIPSIS);
    } else {
      const values = value
        .map((value) => stringify(value, depth + 1))
        .join(SEPARATOR);

      return wrapArray(values);
    }
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);

    if (keys.length === 0) {
      return wrapObject();
    } else if (depth >= maxDepth) {
      return wrapObject(ELLIPSIS);
    } else {
      const values = keys
        .map((key) => wrapProperty(key, stringify(value[key], depth + 1)))
        .join(SEPARATOR);

      return wrapObject(values);
    }
  } else {
    return JSON.stringify(value);
  }
}
