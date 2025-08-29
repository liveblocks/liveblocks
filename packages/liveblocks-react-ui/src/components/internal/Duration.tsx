import { memo, type ComponentProps } from "react";

import { useRerenderEvery } from "../../utils/use-rerender-every";

interface DurationProps extends ComponentProps<"span"> {
  /**
   * The start time as an ISO string or Date
   */
  startedAt: string | Date;

  /**
   * The end time as an ISO string or Date. If provided, stops re-rendering.
   */
  endedAt?: string | Date;
}

/**
 * A component that displays the duration between startedAt and endedAt. If
 * endedAt is not provided, it displays the duration from startedAt to the
 * current time. Automatically re-renders every 250ms while endedAt is not
 * provided. Uses formatted duration display (1 decimal for <3s, whole seconds
 * for ≥3s).
 */
export const Duration = memo(({ startedAt, endedAt }: DurationProps) => {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const duration = (end - start) / 1000;

  // Re-render frequently for short durations, less frequently for longer ones
  useRerenderEvery(endedAt ? null : 200);
  return <span>{duration.toFixed(1)} seconds</span>;
});
