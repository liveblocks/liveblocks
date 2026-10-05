import { createHistogram } from "node:perf_hooks";

/** A fixed-memory histogram in microseconds, capped at one hour. */
export class MillisecondHistogram {
  private readonly histogram = createHistogram({
    lowest: 1,
    highest: 3_600_000_000,
    figures: 3,
  });
  private clipped = 0;

  record(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) return;
    if (ms > 3_600_000) this.clipped++;
    this.histogram.record(
      Math.max(1, Math.round(Math.min(ms, 3_600_000) * 1000))
    );
  }

  snapshot() {
    const h = this.histogram;
    return {
      count: h.count,
      clipped: this.clipped,
      p50Ms: h.count ? h.percentile(50) / 1000 : null,
      p95Ms: h.count ? h.percentile(95) / 1000 : null,
      p99Ms: h.count ? h.percentile(99) / 1000 : null,
      maxMs: h.count ? h.max / 1000 : null,
    };
  }
}

/** Keep one sequence per writer per recipient, rather than all mutation samples. */
export class Observations {
  private readonly sequences = new Map<string, number>();
  skipped = 0;

  observe(writer: string, sequence: number): boolean {
    const previous = this.sequences.get(writer) ?? 0;
    if (sequence <= previous) return false;
    this.skipped += Math.max(0, sequence - previous - 1);
    this.sequences.set(writer, sequence);
    return true;
  }
}
