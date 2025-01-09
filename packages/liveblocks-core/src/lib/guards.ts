import { isPlainObject } from "./utils";

/**
 * Check if value is of shape { startsWith: string }
 */
export function isStartsWith(blob: unknown): blob is { startsWith: string } {
  return isPlainObject(blob) && isString(blob.startsWith);
}

// Using inference for this type guard is better than manually annotating it
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function isString(value: unknown) {
  return typeof value === "string";
}
