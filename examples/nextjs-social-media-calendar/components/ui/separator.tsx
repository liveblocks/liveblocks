"use client";

import { Separator as UiSeparator } from "@ui-sdk/react/separator";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Separator({
  className,
  ...props
}: ComponentProps<typeof UiSeparator>) {
  return (
    <UiSeparator
      className={cn(
        "shrink-0 bg-neutral-200 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-5 data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  );
}
