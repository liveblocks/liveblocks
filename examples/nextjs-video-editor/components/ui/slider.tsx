"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "group/slider relative flex h-5 w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-neutral-200">
        <SliderPrimitive.Range className="absolute h-full bg-neutral-800" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3.5 cursor-grab rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.14),0_1px_3px_rgb(0_0_0/0.2)] transition-[box-shadow,scale] outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-ring/40 active:cursor-grabbing" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
