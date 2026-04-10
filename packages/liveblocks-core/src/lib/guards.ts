export function isDefined<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function isPlainObject(
  blob: unknown
): blob is { [key: string]: unknown } {
  // Implementation borrowed from pojo decoder, see
  // https://github.com/nvie/decoders/blob/78849f843193647eb6b5307240387bdcff7161fb/src/lib/objects.js#L10-L41
  return (
    blob !== null &&
    typeof blob === "object" &&
    Object.prototype.toString.call(blob) === "[object Object]"
  );
}

/**
 * Check if value is of shape { startsWith: string }
 */
export function isStartsWithOperator(
  blob: unknown
): blob is { startsWith: string } {
  return isPlainObject(blob) && typeof blob.startsWith === "string";
}

export function isNumberOperator(
  blob: unknown
): blob is { lt?: number; gt?: number; lte?: number; gte?: number } {
  return (
    isPlainObject(blob) &&
    (typeof blob.lt === "number" ||
      typeof blob.gt === "number" ||
      typeof blob.lte === "number" ||
      typeof blob.gte === "number")
  );
}
