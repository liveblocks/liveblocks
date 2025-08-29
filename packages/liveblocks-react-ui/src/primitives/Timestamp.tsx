"use client";

import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import type { ComponentPropsWithSlot } from "../types";
import { capitalize } from "../utils/capitalize";
import { dateTimeFormat, relativeTimeFormat } from "../utils/intl";
import { useInterval } from "../utils/use-interval";
import { useRerender } from "../utils/use-rerender";

const DYNAMIC_DATE_THRESHOLD = 3 * 24 * 60 * 60 * 1000; // 3 days
const RENDER_INTERVAL = 30 * 1000; // 30 seconds

const TIMESTAMP_NAME = "Timestamp";

export interface TimestampProps
  extends Omit<ComponentPropsWithSlot<"time">, "children" | "title"> {
  /**
   * The date to display.
   */
  date: Date | string | number;

  /**
   * A function to format the displayed date.
   */
  children?: (date: Date, locale?: string) => ReactNode;

  /**
   * The `title` attribute's value or a function to format it.
   */
  title?: string | ((date: Date, locale?: string) => string);

  /**
   * The interval in milliseconds at which the component will re-render.
   * Can be set to `false` to disable re-rendering.
   */
  interval?: number | false;

  /**
   * The locale used when formatting the date.
   */
  locale?: string;
}

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
function formatVerboseDate(date: Date, locale?: string) {
  const formatter = dateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  return capitalize(formatter.format(date));
}

/**
 * Formats a date absolutely with only the day and month.
 */
function formatShortDate(date: Date, locale?: string) {
  const formatter = dateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  return capitalize(formatter.format(date));
}

// Some locales' relative formatting can be broken (e.g. "-1h") when using the narrow style.
const localesWithBrokenNarrowRelativeFormatting = [
  "br",
  "fr",
  "nb",
  "nn",
  "no",
  "ro",
  "sv",
];

/**
 * Formats a date relatively.
 */
export function formatRelativeDate(date: Date, locale?: string) {
  let resolvedLocale: string;

  if (locale) {
    resolvedLocale = locale;
  } else {
    const formatter = relativeTimeFormat();

    resolvedLocale = formatter.resolvedOptions().locale;
  }

  const isBrokenWhenNarrow = localesWithBrokenNarrowRelativeFormatting.some(
    (locale) =>
      resolvedLocale === locale || resolvedLocale.startsWith(`${locale}-`)
  );

  const formatter = relativeTimeFormat(resolvedLocale, {
    style: isBrokenWhenNarrow ? "short" : "narrow",
    numeric: "auto",
  });

  let difference = (date.getTime() - Date.now()) / 1000;

  if (
    difference > -relativeUnits.seconds &&
    difference < relativeUnits.seconds
  ) {
    return formatter.format(0, "seconds");
  }

  for (const [unit, length] of Object.entries(relativeUnits)) {
    if (Math.abs(difference) < length) {
      return formatter.format(
        Math.round(difference),
        unit as Intl.RelativeTimeFormatUnit
      );
    }

    difference /= length;
  }

  return capitalize(formatter.format(Math.round(difference), "years"));
}

/**
 * Formats a date relatively if it's recent or soon,
 * otherwise absolutely with only the day and month.
 */
function formatDynamicDate(date: Date, locale?: string) {
  return Math.abs(date.getTime() - Date.now()) <= DYNAMIC_DATE_THRESHOLD
    ? formatRelativeDate(date, locale)
    : formatShortDate(date, locale);
}

/**
 * Displays a formatted date, and automatically re-renders to support relative
 * formatting. Defaults to relative formatting for nearby dates and a short
 * absolute formatting for more distant ones.
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
      locale,
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
          ? renderTitle(parsedDate, locale)
          : renderTitle,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [renderTitle, parsedDate, key]
    );
    const children = useMemo(
      () =>
        typeof renderChildren === "function"
          ? renderChildren(parsedDate, locale)
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
