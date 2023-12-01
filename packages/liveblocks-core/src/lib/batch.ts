const DEFAULT_SIZE = 50;
const DEFAULT_DELAY = 100;

type Resolve<T> = (value: T | Promise<T>) => void;

type Reject = (reason?: unknown) => void;

type BatchCallback<Result, Args extends unknown[]> = (
  args: Args[]
) => (Result | Error)[] | Promise<(Result | Error)[]>;

class BatchItem<Result, Args extends unknown[]> {
  readonly args: Args;
  readonly resolve: Resolve<Result>;
  readonly reject: Reject;

  constructor(args: Args, resolve: Resolve<Result>, reject: Reject) {
    this.args = args;
    this.resolve = resolve;
    this.reject = reject;
  }
}

interface Options {
  /**
   * How many items to batch together at most.
   */
  size?: number;

  /**
   * How long to wait before flushing the batch.
   */
  delay?: number;
}

/**
 * Batch calls to a function, either by number of calls or by a maximum delay.
 */
export class Batch<Result, Args extends unknown[] = []> {
  private queue: BatchItem<Result, Args>[] = [];
  private callback: BatchCallback<Result, Args>;
  private size: number;
  private delay: number;
  private delayTimeoutId?: ReturnType<typeof setTimeout>;

  constructor(callback: BatchCallback<Result, Args>, options?: Options) {
    this.callback = callback;
    this.size = options?.size ?? DEFAULT_SIZE;
    this.delay = options?.delay ?? DEFAULT_DELAY;
  }

  private clearDelayTimeout(): void {
    if (this.delayTimeoutId !== undefined) {
      clearTimeout(this.delayTimeoutId);
      this.delayTimeoutId = undefined;
    }
  }

  private schedule() {
    if (this.queue.length === this.size) {
      void this.flush();
    } else if (this.queue.length === 1) {
      this.clearDelayTimeout();
      this.delayTimeoutId = setTimeout(() => void this.flush(), this.delay);
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const items = this.queue.splice(0);
    const args = items.map((item) => item.args);

    try {
      const results = await this.callback(args);

      items.forEach((item, index) => {
        const result = results?.[index];

        if (result instanceof Error) {
          item.reject(result);
        } else if (result !== undefined) {
          item.resolve(result);
        } else {
          if (Array.isArray(results)) {
            item.reject(
              new Error(
                `Batch callback must return an array of the same length as the number of items in the batch. Expected ${items.length}, but got ${results.length}.`
              )
            );
          } else {
            item.reject(new Error("Batch callback must return an array."));
          }
        }
      });
    } catch (error) {
      items.forEach((item) => {
        item.reject(error);
      });
    }
  }

  add(...args: Args): Promise<Result> {
    return new Promise<Result>((resolve, reject) => {
      this.queue.push(new BatchItem(args, resolve, reject));
      this.schedule();
    });
  }

  clear(): void {
    this.queue = [];
    this.clearDelayTimeout();
  }
}
