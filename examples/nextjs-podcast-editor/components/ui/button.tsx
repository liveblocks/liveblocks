import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  dark: "bg-neutral-900 text-white shadow-xs hover:bg-neutral-800",
  outline:
    "border border-border bg-white text-neutral-900 shadow-xs hover:bg-neutral-50",
  ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
  soft: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200/70",
} as const;

const SIZES = {
  default: "h-9 gap-2 px-4 text-sm has-[>svg]:px-3",
  sm: "h-8 gap-1.5 px-3 text-sm has-[>svg]:px-2.5",
  xs: "h-7 gap-1.5 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3.5",
  icon: "size-9",
  "icon-sm": "size-8",
  "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
} as const;

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  asChild?: boolean;
};

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      type={asChild ? undefined : type}
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}
