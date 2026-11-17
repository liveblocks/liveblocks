"use client";

import {
  Switch as UiSwitch,
  SwitchThumb as UiSwitchThumb,
} from "@ui-sdk/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** An on/off control. Takes `checked`, `onCheckedChange` and `disabled`. */
export function Switch({
  className,
  ...props
}: ComponentProps<typeof UiSwitch>) {
  return (
    <UiSwitch
      className={cn(
        "inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-neutral-300 p-0.5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <UiSwitchThumb className="block size-5 rounded-full bg-white shadow-sm transition-transform data-checked:translate-x-4" />
    </UiSwitch>
  );
}
