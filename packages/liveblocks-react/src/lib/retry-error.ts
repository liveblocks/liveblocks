const MAX_ERROR_RETRY_COUNT = 5;

const ERROR_RETRY_INTERVAL = 5000; // 5 seconds

/**
 * Retries an action using the exponential backoff algorithm
 * @param action The action to retry
 * @param retryCount The number of times the action has been retried
 */
export function retryError(action: () => void, retryCount: number) {
  if (retryCount >= MAX_ERROR_RETRY_COUNT) return;

  const timeout = Math.pow(2, retryCount) * ERROR_RETRY_INTERVAL;

  setTimeout(() => {
    void action();
  }, timeout);
}
