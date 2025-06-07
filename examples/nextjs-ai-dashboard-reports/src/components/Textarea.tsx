// Tremor Raw Textarea [v0.0.1]

import React from "react"

import { cx, focusInput, hasErrorInput } from "@/lib/utils"

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError, ...props }: TextareaProps, forwardedRef) => {
    return (
      <textarea
        ref={forwardedRef}
        className={cx(
          // base
          "flex min-h-[4rem] w-full rounded-md border px-3 py-1.5 shadow-sm outline-none transition-colors sm:text-sm",
          // text color
          "text-gray-900 dark:text-gray-50",
          // border color
          "border-gray-300 dark:border-gray-800",
          // background color
          "bg-white dark:bg-[#090E1A]",
          // placeholder color
          "placeholder-gray-400 dark:placeholder-gray-500",
          // disabled
          "disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-300",
          "disabled:dark:border-gray-700 disabled:dark:bg-gray-800 disabled:dark:text-gray-500",
          // focus
          focusInput,
          // error
          hasError ? hasErrorInput : "",
          // invalid (optional)
          // "aria-[invalid=true]:dark:ring-red-400/20 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-200 aria-[invalid=true]:border-red-500 invalid:ring-2 invalid:ring-red-200 invalid:border-red-500"
          className,
        )}
        tremor-id="tremor-raw"
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea, type TextareaProps }
