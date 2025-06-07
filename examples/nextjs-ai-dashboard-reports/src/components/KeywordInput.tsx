// Tremor Raw Input [v1.0.2]
"use client"

import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusInput, hasErrorInput } from "@/lib/utils"

const inputStyles = tv({
  base: [
    // base
    "relative block w-full appearance-none rounded-md border px-2.5 py-2 shadow-sm outline-none transition sm:text-sm",
    // border color
    "border-gray-300 dark:border-gray-800",
    // text color
    "text-gray-900 dark:text-gray-50",
    // placeholder color
    "placeholder-gray-400 dark:placeholder-gray-500",
    // background color
    "bg-white dark:bg-gray-950",
    // disabled
    "disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400",
    "disabled:dark:border-gray-700 disabled:dark:bg-gray-800 disabled:dark:text-gray-500",
    // focus
    focusInput,
    // invalid (optional)
    // "aria-[invalid=true]:dark:ring-red-400/20 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-200 aria-[invalid=true]:border-red-500 invalid:ring-2 invalid:ring-red-200 invalid:border-red-500"
    // remove search cancel button (optional)
    "[&::--webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
  ],
  variants: {
    hasError: {
      true: hasErrorInput,
    },
  },
})

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
  VariantProps<typeof inputStyles> {
  inputClassName?: string
}

const KeywordInput = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, inputClassName, hasError, type, ...props }: InputProps,
    forwardedRef,
  ) => {
    return (
      <div className={cx("relative w-full", className)} tremor-id="tremor-raw">
        <input
          ref={forwardedRef}
          type={type}
          className={cx("block !pl-8", inputStyles({ hasError }))}
          {...props}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span
            className="size-2 rounded-sm bg-rose-600 dark:bg-rose-500"
            aria-hidden="true"
          />
        </div>
      </div>
    )
  },
)

KeywordInput.displayName = "Input"

export { inputStyles, KeywordInput, type InputProps }
