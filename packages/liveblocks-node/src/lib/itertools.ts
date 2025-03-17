/**
 * Iterates an async iterable, invoking a side-effect on every element. Will
 * run at most `concurrency` callbacks simultaneously.
 */
export async function runConcurrently<T>(
  iterable: AsyncIterable<T>,
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const queue = new Set<Promise<void>>();

  for await (const item of iterable) {
    // If we've reached max concurrency, wait for one task to complete
    if (queue.size >= concurrency) {
      await Promise.race(queue);
    }

    // Process the next item in the queue
    const promise = (async () => {
      try {
        await fn(item);
      } finally {
        // @ts-expect-error var used before it was assigned, but it's fine
        queue.delete(promise);
      }
    })();

    queue.add(promise);
  }

  // Wait for any remaining tasks
  if (queue.size > 0) {
    await Promise.all(queue);
  }
}
