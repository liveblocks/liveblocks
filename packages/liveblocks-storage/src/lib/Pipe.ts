import type { EventSource, Observable } from "~/lib/EventSource.js";
import { makeEventSource } from "~/lib/EventSource.js";
import { raise } from "~/utils.js";

/**
 * Abstracts the network and provides control over how messages will be
 * delivered between client and server on a per-test basis.
 *
 * Delivery will be fast and automatic by default, but never synchronous.
 */
export type Pipe<T> = {
  send(data: T): void; // One end sends data into the pipe
  output: Observable<T>; // Other end receives data from the pipe (which doesn't necessarily happen synchronously)

  // Control pipe behavior by slowing down (simulate slow network)
  // Set to -1 to drop messages entirely
  // Only has an effect when pipe is in auto mode
  // slow(delay: number | (() => number)): void;

  // Manual pipe control options to pause/unpause delivery
  setAuto(): void; // The default mode
  setManual(): void;

  // Control pipe by delivering all buffered messages in the pipe
  flush(): Promise<void>;
};

export function makePipe<T>(): Pipe<T> {
  let mode: "auto" | "manual" = "auto";

  const buffer: T[] = [];
  const output: EventSource<T> = makeEventSource<T>();

  // Please note that `.send()` is a synchronous API. This can be deceiving,
  // because it may lead to asynchronous side effects (messages delivered later).
  // That's why it's important to close every test with an
  // `await pipe.flush()`, and await all those promises!
  function send(input: T) {
    buffer.push(input);

    if (mode === "auto" && !pendingFlush$) {
      void flush();
    }
  }

  function delay() {
    // Or use callback slow() here?
    return new Promise<void>((res) => setTimeout(res, 0));
  }

  let pendingFlush$: Promise<void> | null = null;

  async function flushNow() {
    if (pendingFlush$) raise("Internal corruption");

    let data: T | undefined;
    while ((data = buffer.shift()) !== undefined) {
      // Add artificial delay between each loop?
      await delay();

      if (output.count() === 0) {
        raise("Can't send to broken pipe");
      }
      try {
        output.notify(data);
      } catch {
        // Ignore
      }
    }

    // Clear the pending
    pendingFlush$ = null;
  }

  function flush() {
    return (pendingFlush$ ??= flushNow());
  }

  function setAuto() {
    mode = "auto";
    if (!pendingFlush$) {
      void flush();
    }
  }

  function setManual() {
    mode = "manual";
  }

  return {
    send,
    output: output.observable,
    setAuto,
    setManual,
    flush,
  };
}
