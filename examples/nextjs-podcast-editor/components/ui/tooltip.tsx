"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "popup-animate z-50 flex items-center gap-1.5 rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-md",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

/** A keyboard shortcut hint inside a tooltip. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-sm bg-white/15 px-1 font-sans text-[11px] text-white/80">
      {children}
    </kbd>
  );
}

/** The common case: a trigger with a text tooltip (and an optional shortcut). */
export function WithTooltip({
  label,
  shortcut,
  side,
  children,
}: {
  label: ReactNode;
  shortcut?: string;
  side?: ComponentProps<typeof TooltipPrimitive.Content>["side"];
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>
        {label}
        {shortcut ? <Kbd>{shortcut}</Kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}
