// Tremor Raw Checkbox [v0.0.0]

import { cx, focusRing } from "@/lib/utils"
import * as CheckboxPrimitives from "@radix-ui/react-checkbox"
import React from "react"

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitives.Root>
>(({ className, checked, ...props }, forwardedRef) => {
  return (
    <CheckboxPrimitives.Root
      ref={forwardedRef}
      {...props}
      checked={checked}
      className={cx(
        // base
        "relative inline-flex size-4 shrink-0 appearance-none items-center justify-center rounded-sm border shadow-xs outline-hidden transition duration-100 enabled:cursor-pointer",
        // text color
        "text-white dark:text-gray-50",
        // background color
        "bg-white dark:bg-[#090E1A]",
        // border color
        "border-gray-300 dark:border-gray-800",
        // disabled
        "data-disabled:border-gray-300 data-disabled:bg-gray-100 data-disabled:text-gray-400",
        "dark:data-disabled:border-gray-700 dark:data-disabled:bg-gray-800 dark:data-disabled:text-gray-500",
        // "dark:disabled:border-gray-700 dark:disabled:bg-gray-800 dark:disabled:text-gray-500",
        // checked and enabled
        "enabled:data-[state=checked]:border-0 enabled:data-[state=checked]:border-transparent enabled:data-[state=checked]:bg-blue-500",
        // indeterminate
        "enabled:data-[state=indeterminate]:border-0 enabled:data-[state=indeterminate]:border-transparent enabled:data-[state=indeterminate]:bg-blue-500",
        // focus
        focusRing,
        className,
      )}
      tremor-id="tremor-raw"
    >
      <CheckboxPrimitives.Indicator className="flex size-full items-center justify-center">
        {checked === "indeterminate" ? (
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              x1="4"
              x2="12"
              y1="8"
              y2="8"
            ></line>
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.2 5.59998L6.79999 9.99998L4.79999 7.99998"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            ></path>
          </svg>
        )}
      </CheckboxPrimitives.Indicator>
    </CheckboxPrimitives.Root>
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
