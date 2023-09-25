const IDLE_CALLBACK_FALLBACK_TIMEOUT = 100;

function requestIdleCallbackFallback(callback: () => void) {
  return setTimeout(callback, IDLE_CALLBACK_FALLBACK_TIMEOUT);
}

/**
 * Ponyfill for `window.requestIdleCallback`.
 */
export const requestIdleCallback =
  window.requestIdleCallback ?? requestIdleCallbackFallback;

/**
 * Ponyfill for `window.cancelIdleCallback`.
 */
export const cancelIdleCallback =
  window.cancelIdleCallback ?? window.clearTimeout;
