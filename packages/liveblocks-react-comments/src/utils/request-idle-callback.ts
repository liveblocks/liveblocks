const IDLE_CALLBACK_FALLBACK_TIMEOUT = 100;

function requestIdleCallbackFallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
) {
  return setTimeout(
    callback,
    Math.min(options?.timeout ?? Infinity, IDLE_CALLBACK_FALLBACK_TIMEOUT)
  );
}

/**
 * Ponyfill for `window.requestIdleCallback`.
 */
export const requestIdleCallback: typeof window.requestIdleCallback =
  (typeof window !== "undefined" ? window.requestIdleCallback : null) ??
  requestIdleCallbackFallback;

/**
 * Ponyfill for `window.cancelIdleCallback`.
 */
export const cancelIdleCallback: typeof window.cancelIdleCallback =
  (typeof window !== "undefined" ? window.cancelIdleCallback : null) ??
  clearTimeout;
