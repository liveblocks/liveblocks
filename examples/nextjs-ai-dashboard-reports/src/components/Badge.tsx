// Tremor Raw Badge [v0.0.0]

import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx } from "@/lib/utils"

const badgeVariants = tv({
  base: cx(
    "inline-flex items-center gap-x-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
  ),
  variants: {
    variant: {
      default: [
        "bg-blue-50 text-blue-900 ring-blue-500/30",
        "dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/30",
      ],
      neutral: [
        "bg-gray-50 text-gray-900 ring-gray-500/30",
        "dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20",
      ],
      success: [
        "bg-emerald-50 text-emerald-900 ring-emerald-600/30",
        "dark:bg-emerald-400/10 dark:text-emerald-400 dark:ring-emerald-400/20",
      ],
      error: [
        "bg-rose-50 text-rose-900 ring-rose-600/20",
        "dark:bg-rose-400/10 dark:text-rose-500 dark:ring-rose-400/20",
      ],
      warning: [
        "bg-orange-50 text-orange-900 ring-orange-600/30",
        "dark:bg-orange-400/10 dark:text-orange-500 dark:ring-orange-400/20",
      ],
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface BadgeProps
  extends React.ComponentPropsWithoutRef<"span">,
  VariantProps<typeof badgeVariants> { }

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }: BadgeProps, forwardedRef) => {
    return (
      <span
        ref={forwardedRef}
        className={cx(badgeVariants({ variant }), className)}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)

Badge.displayName = "Badge"

export { Badge, badgeVariants, type BadgeProps }
