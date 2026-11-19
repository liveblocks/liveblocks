"use client";

import {
  Tooltip as UiTooltip,
  TooltipContent as UiTooltipContent,
  TooltipTrigger as UiTooltipTrigger,
} from "@ui-sdk/react/tooltip";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Tooltip = UiTooltip;
export const TooltipTrigger = UiTooltipTrigger;

export function TooltipContent({
  className,
  ...props
}: ComponentProps<typeof UiTooltipContent>) {
  return (
    <UiTooltipContent
      sideOffset={6}
      className={cn(
        "z-50 origin-(--transform-origin) rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-md transition-[opacity,scale] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  );
}
