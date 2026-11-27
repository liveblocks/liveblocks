"use client";

import { Toolbar as UiToolbar } from "@ui-sdk/react/toolbar";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * A row of controls with a single tab stop: arrow keys move between its
 * buttons, and between the toggles of a `ToggleGroup` placed inside it.
 */
export function Toolbar({
  className,
  ...props
}: ComponentProps<typeof UiToolbar>) {
  return (
    <UiToolbar className={cn("flex items-center", className)} {...props} />
  );
}
