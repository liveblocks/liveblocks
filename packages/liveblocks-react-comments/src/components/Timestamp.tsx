import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import { useRerender } from "../lib/use-rerender";
import type { ComponentPropsWithSlot } from "../types";
import { useInterval } from "../utils/use-interval";

const DYNAMIC_DATE_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
const RENDER_INTERVAL = 30 * 1000;

const TIMESTAMP_NAME = "Timestamp";

export interface TimestampProps
  extends Omit<ComponentPropsWithSlot<"time">, "children" | "title"> {
  /**
   * The date to be displayed.
   */
  date: Date | string | number;

  /**
   * A function to format the displayed date.
   */
  children?: (date: Date) => ReactNode;

  /**
   * The `title` attribute's value or a function to format it.
   */
  title?: string | ((date: Date) => string);

  /**
   * The interval in milliseconds at which the component will re-render.
   * Can be set to `false` to disable re-rendering.
   */
  interval?: number | false;
}

const verboseFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

const shortFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: "auto",
});

const relativeUnits = {
  seconds: 60,
  minutes: 60,
  hours: 24,
  days: 7,
  weeks: 4.34524,
  months: 12,
};

/**
 * Formats a date absolutely.
 */
function formatVerboseDate(date: Date) {
  return verboseFormatter.format(date);
}

/**
 * Formats a date absolutely with only the day and month.
 */
function formatShortDate(date: Date) {
  return shortFormatter.format(date);
}

/**
 * Formats a date relatively.
 */
function formatRelativeDate(date: Date) {
  let difference = (date.getTime() - Date.now()) / 1000;

  if (
    difference > -relativeUnits.seconds &&
    difference < relativeUnits.seconds
  ) {
    return relativeFormatter.format(0, "seconds");
  }

  for (const [unit, length] of Object.entries(relativeUnits)) {
    if (Math.abs(difference) < length) {
      return relativeFormatter.format(
        Math.round(difference),
        unit as Intl.RelativeTimeFormatUnit
      );
    }

    difference /= length;
  }

  return relativeFormatter.format(Math.round(difference), "years");
}

/**
 * Formats a date relatively if it is less than a week old,
 * otherwise absolutely with only the day and month.
 */
function formatDynamicDate(date: Date) {
  return date.getTime() > Date.now() - DYNAMIC_DATE_THRESHOLD
    ? formatRelativeDate(date)
    : formatShortDate(date);
}

/**
 * Displays a formatted date, and automatically re-renders to support relative
 * formatting. Defaults to relative formatting for recent dates and a short
 * absolute formatting for older ones.
 *
 * @example
 * <Timestamp date={new Date()} />
 *
 * @example
 * <Timestamp date={new Date()} title={(date) => date.toISOString()} interval={false}>
 *   {(date) => date.toLocaleDateString()}
 * </Timestamp>
 */
export const Timestamp = forwardRef<HTMLTimeElement, TimestampProps>(
  (
    {
      date,
      children: renderChildren = formatDynamicDate,
      title: renderTitle = formatVerboseDate,
      dateTime,
      interval = RENDER_INTERVAL,
      asChild,
      ...props
    },
    forwardedRef
  ) => {
    const Component = asChild ? Slot : "time";
    const [rerender, key] = useRerender();
    const parsedDate = useMemo(() => new Date(date), [date]);
    const normalizedDate = useMemo(
      () => parsedDate.toISOString(),
      [parsedDate]
    );
    const title = useMemo(
      () =>
        typeof renderTitle === "function"
          ? renderTitle(parsedDate)
          : renderTitle,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [renderTitle, parsedDate, key]
    );
    const children = useMemo(
      () =>
        typeof renderChildren === "function"
          ? renderChildren(parsedDate)
          : renderChildren,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [renderChildren, parsedDate, key]
    );

    useInterval(rerender, interval);

    return (
      <Component
        {...props}
        ref={forwardedRef}
        dateTime={dateTime ?? normalizedDate}
        title={title}
      >
        {children}
      </Component>
    );
  }
);

if (process.env.NODE_ENV !== "production") {
  Timestamp.displayName = TIMESTAMP_NAME;
}
