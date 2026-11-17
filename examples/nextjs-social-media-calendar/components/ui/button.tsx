"use client";

import { Button as UiButton } from "@ui-sdk/react/button";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  outline:
    "border border-border bg-white text-neutral-900 shadow-xs hover:bg-neutral-50",
  ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
  soft: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70",
} as const;

const SIZES = {
  default: "h-9 gap-2 px-4 text-sm has-[>svg]:px-3",
  sm: "h-8 gap-1.5 px-3 text-sm has-[>svg]:px-2.5",
  "icon-sm": "size-8",
  "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
} as const;

export type ButtonProps = ComponentProps<typeof UiButton> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

/**
 * ui-sdk's Button with the app's looks. Pass `render={<Link href="…" />}` to
 * render it as a link, and return a Promise from `onClick` to keep it
 * pending while an action runs (`data-pending`).
 */
export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <UiButton
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring data-disabled:pointer-events-none data-disabled:opacity-50 data-pending:pointer-events-none data-pending:opacity-70 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}
