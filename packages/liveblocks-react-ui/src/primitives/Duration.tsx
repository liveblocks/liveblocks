"use client";

import type { Relax } from "@liveblocks/core";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ReactNode, useMemo } from "react";

import type { ComponentPropsWithSlot } from "../types";
import { useInterval } from "../utils/use-interval";
import { useRerender } from "../utils/use-rerender";

const RENDER_INTERVAL = 0.5 * 1000; // 0.5 second

const DURATION_NAME = "Duration";

export type DurationProps = Omit<
  ComponentPropsWithSlot<"time">,
  "children" | "title"
> &
  Relax<
    | {
        /**
         * The duration in milliseconds.
         * If provided, `from` and `to` will be ignored.
         */
        duration: number;
      }
    | {
        /**
         * The date at which the duration starts.
         * If provided, `duration` will be ignored.
         * If provided without `to` it means that the duration is in progress,
         * and the component will re-render at an interval, customizable with
         * the `interval` prop.
         */
        from: Date | string | number;

        /**
         * The date at which the duration ends.
         */
        to?: Date | string | number;
      }
  > & {
    /**
     * A function to format the displayed duration.
     */
    children?: (duration: number, locale?: string) => ReactNode;

    /**
     * The `title` attribute's value or a function to format it.
     */
    title?: string | ((duration: number, locale?: string) => string);

    /**
     * The interval in milliseconds at which the component will re-render if
     * `from` is provided without `to`, meaning that the duration is in progress.
     * Can be set to `false` to disable re-rendering.
     */
    interval?: number | false;

    /**
     * The locale used when formatting the duration.
     */
    locale?: string;
  };

/**
 * Formats a duration in a short format.
 */
function formatShortDuration(duration: number, locale?: string) {
  // TODO: Implement formatting with Intl.DurationFormat

  console.log(duration, locale);

  return duration.toString();
}

/**
 * Formats a duration in a longer format.
 */
function formatVerboseDuration(duration: number, locale?: string) {
  // TODO: Implement formatting with Intl.DurationFormat

  console.log(duration, locale);

  return duration.toString();
}

/**
 * Formats a duration as ISO 8601.
 * We'll be able to use `Temporal.Duration` instead when it's available
 * in all major browsers.
 */
export function formatIso8601Duration(duration: number) {
  const normalizedDuration = Math.max(duration, 0);

  if (normalizedDuration === 0) {
    return "PT0S";
  }

  const milliseconds = normalizedDuration % 1000;
  let seconds = Math.floor(normalizedDuration / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);
  let days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  seconds = seconds % 60;
  minutes = minutes % 60;
  hours = hours % 24;
  days = days % 7;

  let isoDuration = "P";

  // 1. Weeks
  if (weeks > 0) {
    isoDuration += `${weeks}W`;
  }

  // 2. Days
  if (days > 0) {
    isoDuration += `${days}D`;
  }

  if (hours > 0 || minutes > 0 || seconds > 0 || milliseconds > 0) {
    isoDuration += "T";

    // 3. Hours
    if (hours > 0) {
      isoDuration += `${hours}H`;
    }

    // 4. Minutes
    if (minutes > 0) {
      isoDuration += `${minutes}M`;
    }

    // 5. Seconds and milliseconds
    if (seconds > 0 || milliseconds > 0) {
      if (milliseconds > 0) {
        isoDuration += `${seconds}.${milliseconds.toString().padStart(3, "0").replace(/0+$/, "")}S`;
      } else {
        isoDuration += `${seconds}S`;
      }
    }
  }

  return isoDuration;
}

/**
 * Converts a Date or Date-like value to a timestamp in milliseconds.
 */
function getDateTime(date: Date | string | number) {
  if (date instanceof Date) {
    return date.getTime();
  }

  return new Date(date).getTime();
}

/**
 * Displays a formatted duration, and automatically re-renders to if the
 * duration is in progress.
 *
 * @example
 * <Duration duration={3 * 60 * 1000} />
 *
 * @example
 * <Duration from={fiveHoursAgoDate} />
 *
 * @example
 * <Duration from={fiveHoursAgoDate} to={oneHourAgoDate} />
 */
export const Duration = forwardRef<HTMLTimeElement, DurationProps>(
  (
    {
      duration,
      from,
      to,
      locale,
      dateTime,
      title: renderTitle = formatVerboseDuration,
      children: renderChildren = formatShortDuration,
      interval = RENDER_INTERVAL,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "time";
    const [rerender, key] = useRerender();
    const resolvedDuration = useMemo(() => {
      if (duration !== undefined) {
        return duration;
      }

      if (from !== undefined) {
        return to !== undefined
          ? getDateTime(to) - getDateTime(from)
          : Date.now() - getDateTime(from);
      }

      return 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [duration, from, to, key]);
    const normalizedDuration = useMemo(
      () => formatIso8601Duration(resolvedDuration),
      [resolvedDuration]
    );
    const title = useMemo(
      () =>
        typeof renderTitle === "function"
          ? renderTitle(resolvedDuration, locale)
          : renderTitle,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [renderTitle, resolvedDuration, locale]
    );
    const children = useMemo(
      () =>
        typeof renderChildren === "function"
          ? renderChildren(resolvedDuration, locale)
          : renderChildren,

      [renderChildren, resolvedDuration, locale]
    );

    // Only re-render if the duration is in progress.
    useInterval(
      rerender,
      from !== undefined && to === undefined ? interval : false
    );

    return (
      <Component
        {...props}
        ref={forwardedRef}
        dateTime={dateTime ?? normalizedDuration}
        title={title}
      >
        {children}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  Duration.displayName = DURATION_NAME;
}
