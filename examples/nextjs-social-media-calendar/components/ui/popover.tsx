"use client";

import {
  Popover as UiPopover,
  PopoverContent as UiPopoverContent,
  PopoverTrigger as UiPopoverTrigger,
} from "@ui-sdk/react/popover";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { POPUP_CLASS } from "./menu";

export const Popover = UiPopover;
export const PopoverTrigger = UiPopoverTrigger;

export function PopoverContent({
  className,
  ...props
}: ComponentProps<typeof UiPopoverContent>) {
  return (
    <UiPopoverContent
      sideOffset={6}
      className={cn(POPUP_CLASS, "p-2", className)}
      {...props}
    />
  );
}
