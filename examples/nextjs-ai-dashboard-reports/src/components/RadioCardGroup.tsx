// Tremor Raw Radio Card [v0.0.1]

import * as RadioGroupPrimitives from "@radix-ui/react-radio-group"
import React from "react"

import { cx, focusInput, focusRing } from "@/lib/utils"

const RadioCardGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Root>
>(({ className, ...props }, forwardedRef) => {
  return (
    <RadioGroupPrimitives.Root
      ref={forwardedRef}
      className={cx("grid gap-2", className)}
      tremor-id="tremor-raw"
      {...props}
    />
  )
})

RadioCardGroup.displayName = "RadioCardGroup"

const RadioCardItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Item>
>(({ className, children, ...props }, forwardedRef) => {
  return (
    <RadioGroupPrimitives.Item
      ref={forwardedRef}
      className={cx(
        // base
        "group relative w-full rounded-md border p-4 text-left shadow-xs transition focus:outline-hidden",
        // background color
        "bg-white dark:bg-[#090E1A]",
        // border color
        "border-gray-300 dark:border-gray-800",
        "data-[state=checked]:border-blue-500",
        "dark:data-[state=checked]:border-blue-500",
        // disabled
        "data-disabled:border-gray-100 dark:data-disabled:border-gray-800",
        "data-disabled:bg-gray-50 data-disabled:shadow-none dark:data-disabled:bg-gray-900",
        focusInput,
        className,
      )}
      {...props}
    >
      {children}
    </RadioGroupPrimitives.Item>
  )
})

RadioCardItem.displayName = "RadioCardItem"

const RadioCardIndicator = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitives.Indicator>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitives.Indicator>
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      className={cx(
        // base
        "relative flex size-4 shrink-0 appearance-none items-center justify-center rounded-full border shadow-xs outline-hidden",
        // border color
        "border-gray-300 dark:border-gray-800",
        // background color
        "bg-white dark:bg-gray-950",
        // checked
        "group-data-[state=checked]:border-0 group-data-[state=checked]:border-transparent group-data-[state=checked]:bg-blue-500",
        // disabled
        "group-data-disabled:border-gray-300 group-data-disabled:bg-gray-100 group-data-disabled:text-gray-400",
        "dark:group-data-disabled:border-gray-700 dark:group-data-disabled:bg-gray-800",
        // focus
        focusRing,
        className,
      )}
    >
      <RadioGroupPrimitives.Indicator
        ref={forwardedRef}
        className={cx("flex items-center justify-center")}
        {...props}
      >
        <div
          className={cx(
            // base
            "size size-1.5 shrink-0 rounded-full",
            // indicator
            "bg-white",
            // disabled
            "group-data-disabled:bg-gray-400 dark:group-data-disabled:bg-gray-500",
          )}
        />
      </RadioGroupPrimitives.Indicator>
    </div>
  )
})

RadioCardIndicator.displayName = "RadioCardIndicator"

export { RadioCardGroup, RadioCardIndicator, RadioCardItem }
