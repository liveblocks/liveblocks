"use client";

import {
  SegmentedControl as UiSegmentedControl,
  SegmentedControlItem as UiSegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A choice between a few values, like "m / ft". */
export function SegmentedControl({
  className,
  ...props
}: ComponentProps<typeof UiSegmentedControl>) {
  return (
    <UiSegmentedControl
      className={cn(
        "flex h-7 items-center rounded-md bg-hover p-0.5 text-ink-muted",
        className
      )}
      {...props}
    />
  );
}

export function SegmentedControlItem({
  className,
  ...props
}: ComponentProps<typeof UiSegmentedControlItem>) {
  return (
    <UiSegmentedControlItem
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center rounded px-1.5 text-xs font-medium transition-colors outline-none select-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/60 data-checked:bg-surface data-checked:text-ink data-checked:shadow-xs",
        className
      )}
      {...props}
    />
  );
}
