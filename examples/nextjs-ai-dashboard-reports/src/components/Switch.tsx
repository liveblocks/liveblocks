// Tremor Raw Switch [v0.0.0]

import * as SwitchPrimitives from "@radix-ui/react-switch"
import React from "react"
import { tv, VariantProps } from "tailwind-variants"

import { cx, focusRing } from "@/lib/utils"

const switchVariants = tv({
  slots: {
    root: [
      // base
      "group relative isolate inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-inner ring-1 outline-hidden transition-all ring-inset",
      "bg-neutral-200 dark:bg-neutral-950",
      // ring color
      "ring-black/5 dark:ring-neutral-800",
      // checked
      "data-[state=checked]:bg-black dark:data-[state=checked]:bg-black",
      // disabled
      "data-disabled:cursor-default",
      // disabled checked
      "data-disabled:data-[state=checked]:bg-neutral-200",
      "data-disabled:data-[state=checked]:ring-neutral-300",
      // disabled checked dark
      "dark:data-disabled:data-[state=checked]:ring-neutral-900",
      "dark:data-disabled:data-[state=checked]:bg-neutral-900",
      // disabled unchecked
      "data-disabled:data-[state=unchecked]:ring-neutral-300",
      "data-disabled:data-[state=unchecked]:bg-neutral-100",
      // disabled unchecked dark
      "dark:data-disabled:data-[state=unchecked]:ring-neutral-700",
      "dark:data-disabled:data-[state=unchecked]:bg-neutral-800",
      focusRing,
    ],
    thumb: [
      // base
      "pointer-events-none relative inline-block transform appearance-none rounded-full border-none shadow-lg outline-hidden transition-all duration-150 ease-in-out focus:border-none focus:outline-hidden focus:outline-transparent",
      // background color
      "bg-white dark:bg-neutral-50",
      // disabled
      "group-data-disabled:shadow-none",
      "group-data-disabled:bg-neutral-50 dark:group-data-disabled:bg-neutral-500",
    ],
  },
  variants: {
    size: {
      default: {
        root: "h-5 w-9",
        thumb:
          "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      },
      small: {
        root: "h-4 w-7",
        thumb:
          "h-3 w-3 data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
      },
    },
  },
  defaultVariants: {
    size: "default",
  },
})

interface SwitchProps
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
      "asChild"
    >,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  SwitchProps
>(({ className, size, ...props }: SwitchProps, forwardedRef) => {
  const { root, thumb } = switchVariants({ size })
  return (
    <SwitchPrimitives.Root
      ref={forwardedRef}
      className={cx(root(), className)}
      tremor-id="tremor-raw"
      {...props}
    >
      <SwitchPrimitives.Thumb className={cx(thumb())} />
    </SwitchPrimitives.Root>
  )
})

Switch.displayName = "Switch"

export { Switch }
