import * as console from "./fancy-console";

// Keeps a set of messages in memory that it has warned about
// already. There will be only one message in the console, no
// matter how often it gets called.
const _emittedWarnings: Set<string> = new Set();

/**
 * Emit a warning only once.
 *
 * Only has effect in dev mode. In production, this is a no-op.
 */
// istanbul ignore next
export function warnOnce(message: string, key = message): void {
  if (process.env.NODE_ENV !== "production") {
    if (!_emittedWarnings.has(key)) {
      _emittedWarnings.add(key);
      console.warn(message);
    }
  }
}

/**
 * Emit a warning only once if a condition is met.
 *
 * Only has effect in dev mode. In production, this is a no-op.
 */
// istanbul ignore next
export function warnOnceIf(
  condition: boolean | (() => boolean),
  message: string,
  key = message
): void {
  if (typeof condition === "function" ? condition() : condition) {
    warnOnce(message, key);
  }
}
