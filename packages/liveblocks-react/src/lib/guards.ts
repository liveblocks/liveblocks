import { isPlainObject } from "@liveblocks/core";

/**
 * Check if value is of shape { startsWith: string }
 */
export function isStartsWith(blob: unknown): blob is { startsWith: string } {
  return isPlainObject(blob) && isString(blob.startsWith);
}

export function isString(value: unknown) {
  return typeof value === "string";
}
