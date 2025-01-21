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

/**
 * Check if value is not a null object
 */
export function isNotNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * Check if `process.env` is available
 */
export function isProcessEnvAvailable(): boolean {
  if (typeof process === "undefined" || !isNotNullObject(process)) {
    return false;
  }

  if (!("env" in process) || !isNotNullObject(process.env)) {
    return false;
  }

  return true;
}

function isImportMetaEnv(
  value: unknown
): value is { env: Record<string, unknown> } {
  return isNotNullObject(value) && "env" in value && isNotNullObject(value.env);
}

/**
 * Check if `import.meta.env` is available
 */
export function isImportMetaEnvAvailable(): boolean {
  if (typeof import.meta === "undefined" || !isImportMetaEnv(import.meta)) {
    return false;
  }

  return true;
}
