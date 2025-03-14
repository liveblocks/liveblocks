export async function* asyncFilter<T>(
  it: AsyncIterable<T>,
  pred: (value: T) => boolean
): AsyncIterable<T> {
  for await (const x of it) {
    if (pred(x)) yield x;
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function* asyncIter<T>(array: Iterable<T>): AsyncIterable<T> {
  for (const item of array) {
    yield item;
  }
}

export async function asyncConsume<T>(
  asyncIterable: AsyncIterable<T>
): Promise<T[]> {
  const result: T[] = [];

  for await (const item of asyncIterable) {
    result.push(item);
  }

  return result;
}
