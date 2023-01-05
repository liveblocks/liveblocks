import type { Json, JsonObject } from "@liveblocks/core";
import unquotedPropertyValidator from "unquoted-property-validator";

export const SEPARATOR = ", ";
export const ELLIPSIS = "…";

export function quoteAsNeeded(key: string | number) {
  return unquotedPropertyValidator(String(key)).needsQuotes ? `"${key}"` : key;
}

export function wrapProperty(key: string | number, value: string) {
  return `${quoteAsNeeded(key)}: ${value}`;
}

export function wrapArray(values?: string) {
  return `[${values ?? ""}]`;
}

export function wrapObject(values?: string) {
  return values ? `{ ${values} }` : "{}";
}

export function stringify(
  value?: Json,
  maxDepth = 1,
  depth = 0,
  seen = new WeakSet<JsonObject | Json[]>()
): string {
  if (Array.isArray(value)) {
    const isCircular = seen.has(value);

    seen.add(value);

    if (value.length === 0) {
      return wrapArray();
    } else if (depth >= maxDepth || isCircular) {
      return wrapArray(ELLIPSIS);
    } else {
      const values = value
        .map((value) => stringify(value, maxDepth, depth + 1, seen))
        .join(SEPARATOR);

      return wrapArray(values);
    }
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    const isCircular = seen.has(value);

    seen.add(value);

    if (keys.length === 0) {
      return wrapObject();
    } else if (depth >= maxDepth || isCircular) {
      return wrapObject(ELLIPSIS);
    } else {
      const values = keys
        .map((key) =>
          wrapProperty(key, stringify(value[key], maxDepth, depth + 1, seen))
        )
        .join(SEPARATOR);

      return wrapObject(values);
    }
  } else {
    return JSON.stringify(value);
  }
}
