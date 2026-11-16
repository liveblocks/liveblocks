"use client";

import {
  SegmentedControl as UiSegmentedControl,
  SegmentedControlItem as UiSegmentedControlItem,
} from "@ui-sdk/react/segmented-control";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A choice between a few values with no panels of their own, like "Week /
 * Month". For choices that switch content, use Tabs.
 */
export function SegmentedControl({
  className,
  ...props
}: ComponentProps<typeof UiSegmentedControl>) {
  return (
    <UiSegmentedControl
      className={cn(
        "inline-flex h-8 items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5 text-neutral-500",
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
        "inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors outline-none select-none hover:text-neutral-900 focus-visible:ring-[3px] focus-visible:ring-ring data-checked:bg-white data-checked:text-neutral-900 data-checked:shadow-xs data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
