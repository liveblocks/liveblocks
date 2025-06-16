// Tremor Raw Button [v0.1.1]

import { Slot } from "@radix-ui/react-slot"
import { RiLoader2Fill } from "@remixicon/react"
import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusRing } from "@/lib/utils"

const buttonVariants = tv({
  base: [
    // base
    "relative inline-flex items-center justify-center rounded-md border px-3 py-2 text-center text-base font-medium whitespace-nowrap shadow-xs transition-all duration-100 ease-in-out sm:text-sm",
    // disabled
    "disabled:pointer-events-none disabled:shadow-none",
    // focus
    focusRing,
  ],
  variants: {
    variant: {
      primary: [
        // border
        "border-transparent",
        // text color
        "text-white dark:text-black",
        // background color
        "bg-black dark:bg-white",
        // hover color
        "hover:bg-neutral-900 dark:hover:bg-neutral-100",
        // disabled
        "disabled:bg-neutral-100 disabled:text-neutral-400",
        "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600",
      ],
      secondary: [
        // border
        "border-neutral-300 dark:border-neutral-800",
        // text color
        "text-neutral-900 dark:text-neutral-50",
        // background color
        "bg-white dark:bg-neutral-900",
        //hover color
        "hover:bg-neutral-50 dark:hover:bg-neutral-900/30",
        // disabled
        "disabled:text-neutral-400",
        "dark:disabled:text-neutral-600",
      ],
      light: [
        // base
        "shadow-none",
        // border
        "border-transparent",
        // text color
        "text-neutral-900 dark:text-neutral-50",
        // background color
        "bg-neutral-200 dark:bg-neutral-900",
        // hover color
        "hover:bg-neutral-300/70 dark:hover:bg-neutral-900/80",
        // disabled
        "disabled:bg-neutral-100 disabled:text-neutral-400",
        "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600",
      ],
      ghost: [
        // base
        "shadow-none",
        // border
        "border-transparent",
        // text color
        "text-neutral-900 dark:text-neutral-50",
        // hover color
        "bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900/80",
        // disabled
        "disabled:text-neutral-400",
        "dark:disabled:text-neutral-600",
      ],
      destructive: [
        // text color
        "text-white",
        // border
        "border-transparent",
        // background color
        "bg-red-600 dark:bg-red-700",
        // hover color
        "hover:bg-red-700 dark:hover:bg-red-600",
        // disabled
        "disabled:bg-red-300 disabled:text-white",
        "dark:disabled:bg-red-950 dark:disabled:text-red-400",
      ],
    },
  },
  defaultVariants: {
    variant: "primary",
  },
})

interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      isLoading = false,
      loadingText,
      className,
      disabled,
      variant,
      children,
      ...props
    }: ButtonProps,
    forwardedRef,
  ) => {
    const Component = asChild ? Slot : "button"
    return (
      <Component
        ref={forwardedRef}
        className={cx(buttonVariants({ variant }), className)}
        disabled={disabled || isLoading}
        tremor-id="tremor-raw"
        {...props}
      >
        {isLoading ? (
          <span className="pointer-events-none flex shrink-0 items-center justify-center gap-1.5">
            <RiLoader2Fill
              className="size-4 shrink-0 animate-spin"
              aria-hidden="true"
            />
            <span className="sr-only">
              {loadingText ? loadingText : "Loading"}
            </span>
            {loadingText ? loadingText : children}
          </span>
        ) : (
          children
        )}
      </Component>
    )
  },
)

Button.displayName = "Button"

export { Button, buttonVariants, type ButtonProps }
