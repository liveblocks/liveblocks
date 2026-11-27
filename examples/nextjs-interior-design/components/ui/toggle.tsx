"use client";

import {
  Toggle as UiToggle,
  ToggleGroup as UiToggleGroup,
} from "@ui-sdk/react/toggle";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const FOCUS_CLASS =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

/**
 * An on/off button. Style what it looks like while it's on with
 * `data-pressed:`. Inside a `ToggleGroup`, its `value` says which one it is.
 */
export function Toggle({
  className,
  ...props
}: ComponentProps<typeof UiToggle>) {
  return (
    <UiToggle
      className={cn(
        "inline-flex shrink-0 items-center justify-center transition-colors select-none data-disabled:pointer-events-none data-disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        FOCUS_CLASS,
        className
      )}
      {...props}
    />
  );
}

/**
 * A set of toggles sharing one value. With `deselectable={false}` exactly one
 * stays on, like the active tool; arrow keys move between them.
 */
export const ToggleGroup = UiToggleGroup;
