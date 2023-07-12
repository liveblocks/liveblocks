import { Slot } from "@radix-ui/react-slot";
import type { ReactNode } from "react";
import React, { forwardRef, useMemo } from "react";

import { useRerender } from "../lib/use-rerender";
import type { ComponentPropsWithSlot } from "../types";
import { formatDate, formatDateRelative } from "../utils/format-date";
import { useInterval } from "../utils/use-interval";

const RENDER_INTERVAL = 30000;
const TIME_NAME = "Time";

export interface TimeProps
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

/**
 * Displays a formatted date.
 * Defaults to relative formatting with automatic re-rendering.
 *
 * @example
 * <Time date={new Date()} />
 *
 * @example
 * <Time date={new Date()} title={(date) => date.toISOString()} interval={false}>
 *   {(date) => date.toLocaleDateString()}
 * </Time>
 */
export const Time = forwardRef<HTMLTimeElement, TimeProps>(
  (
    {
      date,
      children: renderChildren = formatDateRelative,
      title: renderTitle = formatDate,
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
        data-liveblocks-time=""
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
  Time.displayName = TIME_NAME;
}
