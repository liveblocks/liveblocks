import type { Json } from "@liveblocks/core";

const MAX_DEPTH = Infinity;
const SEPARATOR = ", ";

export function stringify(value?: Json, depth = 0): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    } else if (depth >= MAX_DEPTH) {
      return "[ … ]";
    } else {
      const values = value
        .map((value) => stringify(value, depth + 1))
        .join(SEPARATOR);

      return `[ ${values} ]`;
    }
  } else if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);

    if (keys.length === 0) {
      return "{}";
    } else if (depth >= MAX_DEPTH) {
      return "{ … }";
    } else {
      const values = keys
        .map((key) => `${key}: ${stringify(value[key], depth + 1)}`)
        .join(SEPARATOR);

      return `{ ${values} }`;
    }
  } else {
    return JSON.stringify(value);
  }
}
