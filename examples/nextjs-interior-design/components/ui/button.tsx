"use client";

import { Button as UiButton } from "@ui-sdk/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-ink text-surface hover:bg-ink/85",
  ghost:
    "text-ink-secondary hover:bg-hover hover:text-ink data-pressed:bg-brand-soft data-pressed:text-brand",
} as const;

const SIZES = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  icon: "size-7 [&_svg:not([class*='size-'])]:size-4",
  "icon-sm": "size-6 rounded [&_svg:not([class*='size-'])]:size-3.5",
} as const;

function buttonClass({
  variant = "ghost",
  size = "icon",
  className,
}: {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 data-disabled:pointer-events-none data-disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className
  );
}

export type ButtonProps = Omit<ComponentProps<typeof UiButton>, "className"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
};

/** ui-sdk's Button with the app's looks. */
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <UiButton
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
