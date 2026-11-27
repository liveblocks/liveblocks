"use client";

import { Popover as PopoverPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "popup-animate z-50 min-w-32 rounded-lg bg-white p-3 text-neutral-900 shadow-lg ring-1 ring-neutral-950/10 outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
