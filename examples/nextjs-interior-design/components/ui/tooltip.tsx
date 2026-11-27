"use client";

import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipShortcut as UiTooltipShortcut,
  TooltipTrigger as UiTooltipTrigger,
} from "@ui-sdk/react/tooltip";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const TooltipTrigger = UiTooltipTrigger;

/**
 * A hint for a control. Pass `shortcut`, like `"mod+z"`, and put a
 * `TooltipShortcut` in the content to show the keys for the person's
 * platform (`⌘Z` or `Ctrl+Z`). The tooltip only shows them: the keys are
 * bound with `useShortcut`, where the action lives.
 */
export function Tooltip({
  delay = 300,
  ...props
}: ComponentProps<typeof UiTooltip>) {
  return <UiTooltip delay={delay} {...props} />;
}

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof UiTooltipContent>) {
  return (
    <UiTooltipContent
      sideOffset={sideOffset}
      className={cn(
        "z-50 flex w-max max-w-64 origin-(--transform-origin) items-baseline gap-2 rounded-md bg-ink px-2.5 py-1.5 text-xs text-surface transition-[opacity,scale] duration-100 data-ending-style:scale-95 data-ending-style:opacity-0 data-instant:transition-none data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}

export function TooltipShortcut({
  className,
  ...props
}: ComponentProps<typeof UiTooltipShortcut>) {
  return (
    <UiTooltipShortcut
      className={cn("font-sans text-surface/60", className)}
      {...props}
    />
  );
}
