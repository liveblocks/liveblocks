"use client";

import {
  Switch as UiSwitch,
  SwitchThumb as UiSwitchThumb,
} from "@ui-sdk/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: {
    track: "h-5 w-8",
    thumb: "size-4 data-checked:translate-x-3",
  },
  md: {
    track: "h-6 w-10",
    thumb: "size-5 data-checked:translate-x-4",
  },
};

/** An on/off control. Takes `checked`, `onCheckedChange` and `disabled`. */
export function Switch({
  className,
  size = "md",
  ...props
}: ComponentProps<typeof UiSwitch> & { size?: keyof typeof SIZES }) {
  return (
    <UiSwitch
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-full bg-neutral-300 p-0.5 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        SIZES[size].track,
        className
      )}
      {...props}
    >
      <UiSwitchThumb
        className={cn(
          "block rounded-full bg-white shadow-sm transition-transform",
          SIZES[size].thumb
        )}
      />
    </UiSwitch>
  );
}
