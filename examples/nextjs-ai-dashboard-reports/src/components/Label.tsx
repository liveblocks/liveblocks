// Tremor Raw Label [v0.0.1]

import * as LabelPrimitives from "@radix-ui/react-label"
import React from "react"

import { cx } from "@/lib/utils"

interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitives.Root> {
  disabled?: boolean
}

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitives.Root>,
  LabelProps
>(({ className, disabled, ...props }, forwardedRef) => (
  <LabelPrimitives.Root
    ref={forwardedRef}
    className={cx(
      // base
      "text-sm leading-none",
      // text color
      "text-gray-900 dark:text-gray-50",
      // disabled
      {
        "text-gray-400 dark:text-gray-600": disabled,
      },
      className,
    )}
    aria-disabled={disabled}
    tremor-id="tremor-raw"
    {...props}
  />
))

Label.displayName = "Label"

export { Label }
