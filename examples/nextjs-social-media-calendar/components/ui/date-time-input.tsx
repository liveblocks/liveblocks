"use client";

import { DateInput as UiDateInput } from "@ui-sdk/react/date-input";
import { TimeInput as UiTimeInput } from "@ui-sdk/react/time-input";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Segmented inputs. The root is the field's box; each segment is a small
 * input (`data-slot="date-input-segment"` / `time-input-segment`), with the
 * separators between them as `data-type="literal"` segments.
 */
const ROOT_CLASS =
  "inline-flex h-8 items-center rounded-md border border-border bg-white px-2 text-sm text-neutral-900 shadow-xs transition-colors select-none focus-within:ring-[3px] focus-within:ring-ring data-disabled:pointer-events-none data-disabled:opacity-50 data-invalid:border-red-500";

const SEGMENT_CLASS =
  "[&_[data-slot$=-segment]]:rounded-sm [&_[data-slot$=-segment]]:px-0.5 [&_[data-slot$=-segment]]:text-center [&_[data-slot$=-segment]]:field-sizing-content [&_[data-slot$=-segment]]:tabular-nums [&_[data-slot$=-segment]]:outline-none [&_[data-slot$=-segment]:focus]:bg-primary [&_[data-slot$=-segment]:focus]:text-primary-foreground [&_[data-slot$=-segment][data-empty]]:text-neutral-400 [&_[data-slot$=-segment][data-type=literal]]:px-0 [&_[data-slot$=-segment][data-type=literal]]:text-neutral-400";

export function DateInput({
  className,
  ...props
}: ComponentProps<typeof UiDateInput>) {
  return (
    <UiDateInput
      className={cn(ROOT_CLASS, SEGMENT_CLASS, className)}
      {...props}
    />
  );
}

export function TimeInput({
  className,
  ...props
}: ComponentProps<typeof UiTimeInput>) {
  return (
    <UiTimeInput
      className={cn(ROOT_CLASS, SEGMENT_CLASS, className)}
      {...props}
    />
  );
}
