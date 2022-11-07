import * as console from "./fancy-console";

/**
 * Tools to help with the controlled deprecation of public APIs.
 *
 * First warn, then error, then remove eventually.
 */

// Keeps a set of deprecation messages in memory that it has warned about
// already. There will be only one deprecation message in the console, no
// matter how often it gets called.
const _emittedDeprecationWarnings: Set<string> = new Set();

/**
 * Displays a deprecation warning in the dev console. Only in dev mode, and
 * only once per message/key. In production, this is a no-op.
 */
// istanbul ignore next
export function deprecate(message: string, key = message): void {
  if (process.env.NODE_ENV !== "production") {
    if (!_emittedDeprecationWarnings.has(key)) {
      _emittedDeprecationWarnings.add(key);
      console.errorWithTitle("Deprecation warning", message);
    }
  }
}

/**
 * Conditionally displays a deprecation warning in the dev
 * console if the first argument is truthy. Only in dev mode, and
 * only once per message/key. In production, this is a no-op.
 */
// istanbul ignore next
export function deprecateIf(
  condition: unknown,
  message: string,
  key = message
): void {
  if (process.env.NODE_ENV !== "production") {
    // istanbul ignore if
    if (condition) {
      deprecate(message, key);
    }
  }
}

/**
 * Throws a deprecation error in the dev console.
 *
 * Only triggers in dev mode. In production, this is a no-op.
 */
// istanbul ignore next
export function throwUsageError(message: string): void {
  if (process.env.NODE_ENV !== "production") {
    const usageError = new Error(message);
    usageError.name = "Usage error";
    console.errorWithTitle("Usage error", message);
    throw usageError;
  }
}

/**
 * Conditionally throws a usage error in the dev console if the first argument
 * is truthy. Use this to "escalate" usage patterns that in previous versions
 * we already warned about with deprecation warnings.
 *
 * Only has effect in dev mode. In production, this is a no-op.
 */
// istanbul ignore next
export function errorIf(condition: unknown, message: string): void {
  if (process.env.NODE_ENV !== "production") {
    if (condition) {
      throwUsageError(message);
    }
  }
}
