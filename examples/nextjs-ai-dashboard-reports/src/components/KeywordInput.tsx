// Tremor Raw Input [v1.0.2]
"use client"

import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusInput, hasErrorInput } from "@/lib/utils"

const inputStyles = tv({
  base: [
    // base
    "relative block w-full appearance-none rounded-md border px-2.5 py-2 shadow-xs outline-hidden transition sm:text-sm",
    // border color
    "border-neutral-300 dark:border-neutral-800",
    // text color
    "text-neutral-900 dark:text-neutral-50",
    // placeholder color
    "placeholder-neutral-400 dark:placeholder-neutral-500",
    // background color
    "bg-white dark:bg-neutral-950",
    // disabled
    "disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400",
    "dark:disabled:border-neutral-700 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500",
    // focus
    focusInput,
    // invalid (optional)
    // "dark:aria-invalid:ring-red-400/20 aria-invalid:ring-2 aria-invalid:ring-red-200 aria-invalid:border-red-500 invalid:ring-2 invalid:ring-red-200 invalid:border-red-500"
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
          className={cx("block pl-8!", inputStyles({ hasError }))}
          {...props}
        />
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span
            className="size-2 rounded-xs bg-rose-600 dark:bg-rose-500"
            aria-hidden="true"
          />
        </div>
      </div>
    )
  },
)

KeywordInput.displayName = "Input"

export { inputStyles, KeywordInput, type InputProps }
