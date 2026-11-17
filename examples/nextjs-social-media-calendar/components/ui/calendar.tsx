"use client";

import {
  Calendar as UiCalendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekday,
  CalendarWeekdays,
  CalendarWeeks,
} from "@ui-sdk/react/calendar";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const STEP_CLASS =
  "inline-flex size-7 items-center justify-center rounded-md text-neutral-500 transition-colors outline-none hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4";

const DAY_CLASS =
  "size-8 cursor-pointer rounded-md text-center text-sm text-neutral-900 transition-colors outline-none hover:bg-neutral-100 focus-visible:ring-[3px] focus-visible:ring-ring data-outside:text-neutral-400 data-today:font-semibold data-today:text-primary data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary data-disabled:pointer-events-none data-disabled:text-neutral-300";

/**
 * One month of days with a heading and Previous / Next. Takes `value` (an
 * ISO date or `null`) and `onValueChange`; arrow keys move between days.
 */
export function Calendar({
  className,
  ...props
}: Omit<ComponentProps<typeof UiCalendar>, "children">) {
  return (
    <UiCalendar className={cn("w-[252px] select-none", className)} {...props}>
      <div className="flex items-center justify-between pb-2">
        <CalendarPrevious className={STEP_CLASS}>
          <ChevronLeftIcon />
        </CalendarPrevious>
        <CalendarHeading className="text-sm font-medium text-neutral-900" />
        <CalendarNext className={STEP_CLASS}>
          <ChevronRightIcon />
        </CalendarNext>
      </div>
      <CalendarGrid className="w-full border-separate border-spacing-0">
        <CalendarWeekdays>
          {(index) => (
            <CalendarWeekday
              index={index}
              className="h-8 w-9 text-center text-xs font-normal text-neutral-500"
            />
          )}
        </CalendarWeekdays>
        <CalendarWeeks>
          {(cell) => <CalendarDay value={cell.date} className={DAY_CLASS} />}
        </CalendarWeeks>
      </CalendarGrid>
    </UiCalendar>
  );
}
