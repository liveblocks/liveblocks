// Collects fire-and-forget work (presence, feed status messages, metadata
// sync) so the critical path never waits on it, while still letting the
// request `flush()` everything before it ends. Serverless runtimes can stop the
// process as soon as the handler returns, so un-awaited promises would be lost.
export class BackgroundTasks {
  private tasks: Promise<unknown>[] = [];
  private queue$: Promise<unknown> = Promise.resolve();

  // Run in parallel with everything else.
  add(task$: Promise<unknown>): void {
    this.tasks.push(
      task$.catch((err) => {
        console.warn("[background]", err);
      })
    );
  }

  // Run after previously queued tasks, for work where order matters (e.g. feed
  // messages that must arrive in sequence).
  queue(task: () => Promise<unknown>): void {
    this.queue$ = this.queue$.then(task).catch((err) => {
      console.warn("[background]", err);
    });
    this.tasks.push(this.queue$);
  }

  async flush(): Promise<void> {
    await Promise.allSettled(this.tasks);
  }
}
