"use client";

import * as React from "react";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/** A single-choice toggle group that always keeps one option selected. */
function SegmentedControl<T extends string>({
  value,
  onValueChange,
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof ToggleGroupPrimitive.Root>,
  "type" | "value" | "defaultValue" | "onValueChange"
> & {
  value: T;
  onValueChange: (value: T) => void;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T);
      }}
      className={cn(
        "flex h-8 w-full items-center gap-0.5 rounded-lg bg-neutral-100 p-0.5",
        className
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Root>
  );
}

function SegmentedControlItem({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex h-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap text-neutral-500 transition-colors outline-none hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ring data-[state=on]:bg-white data-[state=on]:text-neutral-900 data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(0_0_0/0.04)] [&_svg]:size-3.5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  );
}

export { SegmentedControl, SegmentedControlItem };
